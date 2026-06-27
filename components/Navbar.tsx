import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogOut, Map, Plus } from "lucide-react";
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
    <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center shadow-sm">
              <Map className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-lg text-gray-900 tracking-tight">
              Community<span className="text-teal-600">Hero</span>
            </span>
          </Link>

          {/* Center Nav Links */}
          <div className="hidden sm:flex items-center gap-1">
            <Link
              href="/discover"
              className="text-sm font-semibold text-gray-600 hover:text-teal-700 px-3 py-2 rounded-lg hover:bg-teal-50 transition-colors"
            >
              Discover
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Points badge */}
                <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full text-sm font-bold">
                  <span>⭐</span>
                  <span>{userProfile?.points ?? 0} pts</span>
                </div>

                {/* User name */}
                <span className="hidden md:inline text-sm font-semibold text-gray-700">
                  {userProfile?.display_name || user.email?.split("@")[0]}
                </span>

                {/* Report CTA */}
                <Link
                  href="/report"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Report</span>
                </Link>

                {/* Logout */}
                <form action={logout}>
                  <button
                    type="submit"
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Log out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
