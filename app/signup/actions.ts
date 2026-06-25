"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        display_name: formData.get("displayName") as string,
      },
    },
  };

  const { data: signUpResult, error } = await supabase.auth.signUp(data);

  if (error) {
    redirect(`/signup?message=${encodeURIComponent(error.message)}`);
  }

  if (signUpResult?.user && !signUpResult?.session) {
    redirect(
      "/login?message=" +
        encodeURIComponent(
          "Registration successful! Please check your email to confirm your account before logging in."
        )
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}
