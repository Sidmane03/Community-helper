import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
        Take back your <span className="text-teal-600">neighborhood.</span>
      </h1>
      <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
        Report broken streetlights, illegal dumping, and potholes instantly.
        Join your neighbors in tracking issues and making your community safer,
        together.
      </p>

      {user ? (
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/report"
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors"
          >
            Report an Issue
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center justify-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
          >
            View Map
          </Link>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors"
          >
            Get Started
          </Link>
        </div>
      )}
    </div>
  );
}
