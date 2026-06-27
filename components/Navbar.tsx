import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogOut, User as UserIcon } from "lucide-react";
import { logout } from "./actions";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userProfile = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("points, display_name")
      .eq("id", user.id)
      .single();
    userProfile = data;
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="font-bold text-xl text-teal-700 tracking-tight">
                Community Hero
              </span>
            </Link>
          </div>
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-700 font-medium">
                  <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full flex items-center">
                    <span className="font-bold mr-1">
                      {userProfile?.points ?? 0}
                    </span>{" "}
                    pts
                  </div>
                  <span className="hidden sm:inline-block">
                    {userProfile?.display_name || user.email}
                  </span>
                </div>
                <form action={logout}>
                  <button
                    type="submit"
                    className="p-2 text-gray-400 hover:text-gray-500 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    title="Log out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="bg-teal-600 text-white hover:bg-teal-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
