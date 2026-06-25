"use server";

import { createClient } from "@/lib/supabase/server";

export interface ReportState {
  success?: boolean;
  error?: string;
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

    // 5. Insert into Database with resilient fallback logic
    const tables = ["Issue", "issues", "issue", "Issues"];
    const columnVariations = [
      { reporterKey: "reporter_id", photoKey: "photo_url", sourceKey: "category_source" },
      { reporterKey: "author_id", photoKey: "photo_url", sourceKey: "category_source" },
      { reporterKey: "reporterId", photoKey: "photoUrl", sourceKey: "categorySource" },
    ];
    const statusVariations = ["reported", "Reported"];

    let insertSuccess = false;
    let lastDbError = null;

    for (const tableName of tables) {
      for (const cols of columnVariations) {
        for (const statusVal of statusVariations) {
          const payload = {
            [cols.reporterKey]: user.id,
            [cols.photoKey]: publicUrl,
            description: description,
            latitude: latitude,
            longitude: longitude,
            status: statusVal,
            category: "Pending AI",
            severity: "Pending AI",
            [cols.sourceKey]: "manual",
          };

          const { data, error } = await supabase
            .from(tableName)
            .insert([payload])
            .select();

          if (!error) {
            insertSuccess = true;
            console.log(`Successfully inserted into table: ${tableName} using ${cols.reporterKey}`);
            break;
          } else {
            lastDbError = error;
            // If PostgREST tells us the table doesn't exist, we break to check the next table
            if (error.code === "PGRST205") {
              break;
            }
          }
        }
        if (insertSuccess) break;
      }
      if (insertSuccess) break;
    }

    if (!insertSuccess) {
      console.error("Database insert error:", lastDbError);
      return {
        error: `Failed to save issue to database: ${
          lastDbError ? JSON.stringify(lastDbError) : "Unknown DB Error"
        }`,
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Server action exception:", err);
    return { error: err.message || "An unexpected error occurred." };
  }
}
