"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function verifyIssue(issueId: string): Promise<{ success: boolean; error?: string; newCount?: number }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in to verify an issue." };
    }

    // Increment verifications_count by 1
    const { data, error } = await supabase.rpc("increment_verifications", { issue_id: issueId });

    if (error) {
      // Fallback: manual increment if RPC not available
      const { data: current } = await supabase
        .from("Issue")
        .select("verifications_count")
        .eq("id", issueId)
        .single();

      const currentCount = current?.verifications_count ?? 0;
      const { error: updateError } = await supabase
        .from("Issue")
        .update({ verifications_count: currentCount + 1 })
        .eq("id", issueId);

      if (updateError) {
        return { success: false, error: "Failed to verify issue." };
      }

      revalidatePath("/discover");
      return { success: true, newCount: currentCount + 1 };
    }

    revalidatePath("/discover");
    return { success: true, newCount: data };
  } catch (err: any) {
    return { success: false, error: err.message || "Unexpected error." };
  }
}
