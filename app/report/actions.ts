"use server";

import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

export interface ReportState {
  success?: boolean;
  error?: string;
  duplicateFound?: boolean;
  duplicateIssue?: {
    id: string;
    description: string;
    photoUrl: string;
    latitude: number;
    longitude: number;
  };
  aiCategory?: string;
  aiSeverity?: string;
}

function normalizeCategory(cat: string): string {
  const c = cat.toLowerCase().replace(/[^a-z0-9]/g, "_");
  if (c.includes("pothole")) return "pothole";
  if (c.includes("leak") || c.includes("water")) return "water_leak";
  if (c.includes("light") || c.includes("street")) return "streetlight";
  if (c.includes("dump") || c.includes("trash") || c.includes("waste")) return "illegal_dumping";
  if (c.includes("prop") || c.includes("damage") || c.includes("vandal")) return "damaged_property";
  return "other";
}

function normalizeSeverity(sev: string): string {
  const s = sev.toLowerCase();
  if (s.includes("low")) return "low";
  if (s.includes("high")) return "high";
  return "medium";
}

export async function reportIssue(
  prevState: ReportState,
  formData: FormData
): Promise<ReportState> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "You must be logged in to report an issue." };
    }

    // 2. Extract and validate description & location
    const description = formData.get("description") as string;
    const latStr = formData.get("latitude") as string;
    const lngStr = formData.get("longitude") as string;

    if (!description || description.trim() === "") {
      return { error: "Description is required." };
    }

    if (!latStr || !lngStr) {
      return { error: "Location coordinates (latitude/longitude) are required." };
    }

    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lngStr);

    if (isNaN(latitude) || isNaN(longitude)) {
      return { error: "Invalid location coordinates." };
    }

    // 3. Extract and validate image file
    const imageFile = formData.get("image") as File | null;
    if (!imageFile || imageFile.size === 0) {
      return { error: "An image photo is required to report an issue." };
    }

    // Guardrail: 5MB size limit
    const MAX_SIZE = 5 * 1024 * 1024;
    if (imageFile.size > MAX_SIZE) {
      return { error: "File size exceeds the 5MB limit." };
    }

    // Guardrail: JPEG, PNG, WEBP formats only
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(imageFile.type)) {
      return { error: "Invalid file format. Only JPEG, PNG, and WEBP images are allowed." };
    }

    // 4. Upload image to 'issue-images' bucket
    const fileExtension = imageFile.name.split(".").pop() || "jpg";
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const filePath = `${user.id}/${Date.now()}-${uniqueId}.${fileExtension}`;

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("issue-images")
      .upload(filePath, buffer, {
        contentType: imageFile.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { error: `Failed to upload image: ${uploadError.message}` };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("issue-images").getPublicUrl(filePath);

    // 5. AI Categorization using Gemini 1.5 Flash
    let aiCategory = formData.get("aiCategory") as string;
    let aiSeverity = formData.get("aiSeverity") as string;

    const bypassDuplicate = formData.get("bypassDuplicate") === "true";

    if (!aiCategory || !aiSeverity) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY is not defined in environment variables.");
        return { error: "AI service key is missing on the server. Please contact an administrator." };
      }

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: { responseMimeType: "application/json" },
        });

        const base64Image = buffer.toString("base64");
        const prompt = `You are a professional civic infrastructure analyzer. Analyze this image and description of a public maintenance issue reported by a citizen.

Citizen Description: "${description}"

Based on the image and description, identify:
1. The most appropriate category. It must be one of the following exact strings:
   - 'pothole'
   - 'water_leak'
   - 'streetlight'
   - 'illegal_dumping'
   - 'damaged_property'
   - 'other'
2. The severity of the issue. It must be one of the following exact strings:
   - 'low'
   - 'medium'
   - 'high'

Return a strict JSON object with exactly two keys: "category" and "severity".
Do not wrap it in markdown code blocks.
Example output:
{
  "category": "pothole",
  "severity": "medium"
}
`;

        const response = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: imageFile.type,
            },
          },
        ]);

        const text = response.response.text();
        // Remove markdown formatting if Gemini includes it
        const cleanedText = text.replace(/```(?:json)?/gi, "").trim();
        const parsed = JSON.parse(cleanedText);
        aiCategory = normalizeCategory(parsed.category || "other");
        aiSeverity = normalizeSeverity(parsed.severity || "medium");
      } catch (err: any) {
        console.error("AI Analysis error:", err);
        aiCategory = "other";
        aiSeverity = "medium";
      }
    }

    // 6. Duplicate check (within ~100 meters, unresolved, same category)
    let duplicateFound = false;
    let duplicateIssue = null;

    if (!bypassDuplicate) {
      const latDelta = 0.0009; // ~100m in degrees of latitude
      const lngDelta = 0.0009; // ~100m in degrees of longitude

      const { data: dupIssues, error: dupError } = await supabase
        .from("Issue")
        .select("*")
        .eq("category", aiCategory)
        .gte("latitude", latitude - latDelta)
        .lte("latitude", latitude + latDelta)
        .gte("longitude", longitude - lngDelta)
        .lte("longitude", longitude + lngDelta)
        .neq("status", "resolved")
        .neq("status", "Resolved")
        .limit(1);

      if (!dupError && dupIssues && dupIssues.length > 0) {
        duplicateFound = true;
        duplicateIssue = dupIssues[0];
      }
    }

    if (duplicateFound && duplicateIssue) {
      return {
        success: false,
        duplicateFound: true,
        duplicateIssue: {
          id: duplicateIssue.id,
          description: duplicateIssue.description,
          photoUrl: duplicateIssue.image_url || duplicateIssue.photo_url || duplicateIssue.photoUrl || "",
          latitude: duplicateIssue.latitude,
          longitude: duplicateIssue.longitude,
        },
        aiCategory,
        aiSeverity,
      };
    }

    // 7. Insert into Database using exact table name 'Issue' and SCHEMA.md columns
    const payload = {
      author_id: user.id,
      image_url: publicUrl,
      description: description,
      latitude: latitude,
      longitude: longitude,
      status: "reported",
      category: aiCategory,
      severity: aiSeverity,
    };

    const { error: dbError } = await supabase
      .from("Issue")
      .insert([payload]);

    if (dbError) {
      console.error("Database insert error:", dbError);
      return {
        error: `Failed to save issue to database: ${JSON.stringify(dbError)}`,
      };
    }

    revalidatePath("/");
    revalidatePath("/discover");

    return { success: true };
  } catch (err: any) {
    console.error("Server action exception:", err);
    return { error: err.message || "An unexpected error occurred." };
  }
}
