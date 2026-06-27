import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MapPin, Camera, Users, ArrowRight, ShieldCheck, TrendingUp, Zap } from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pull quick stats
  const { count: totalCount } = await supabase.from("Issue").select("*", { count: "exact", head: true });
  const { count: resolvedCount } = await supabase
    .from("Issue")
    .select("*", { count: "exact", head: true })
    .eq("status", "resolved");

  return (
    <div className="relative overflow-hidden">
      {/* Background decoration */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(13,148,136,0.12) 0%, transparent 70%)",
        }}
      />

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center text-center py-20 px-4">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-bold mb-6 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
          Hyperlocal · Community-Powered · Free
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1] max-w-3xl">
          Make your{" "}
          <span className="text-teal-600 relative">
            neighborhood
          </span>{" "}
          better, together.
        </h1>

        <p className="mt-5 text-lg sm:text-xl text-gray-500 max-w-2xl leading-relaxed font-medium">
          Report potholes, broken streetlights, and illegal dumping in seconds. 
          Our AI triages every issue instantly — your community gets results faster.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center">
          {user ? (
            <>
              <Link
                href="/report"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-xl text-base font-extrabold text-white bg-teal-600 hover:bg-teal-700 shadow-lg hover:shadow-teal-200/60 transition-all duration-150"
              >
                <Camera className="h-5 w-5" />
                Report an Issue
              </Link>
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-xl text-base font-extrabold text-gray-700 bg-white border border-gray-200 hover:border-teal-300 hover:text-teal-700 shadow-sm transition-all duration-150"
              >
                Explore Issues
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-xl text-base font-extrabold text-white bg-teal-600 hover:bg-teal-700 shadow-lg hover:shadow-teal-200/60 transition-all duration-150"
              >
                Get Started — It&apos;s Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-xl text-base font-bold text-gray-600 bg-white border border-gray-200 hover:border-gray-300 shadow-sm transition-colors"
              >
                Browse Issues
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-3xl font-extrabold text-teal-600">{totalCount ?? 0}</p>
            <p className="text-sm font-semibold text-gray-500 mt-1">Issues Reported</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-3xl font-extrabold text-green-600">{resolvedCount ?? 0}</p>
            <p className="text-sm font-semibold text-gray-500 mt-1">Issues Resolved</p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center">
            <p className="text-3xl font-extrabold text-indigo-600">AI</p>
            <p className="text-sm font-semibold text-gray-500 mt-1">Powered Triage</p>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              icon: <Camera className="h-6 w-6 text-teal-600" />,
              title: "Snap & Report",
              desc: "Take a photo, drop a pin, and write a description. Done in under 60 seconds.",
            },
            {
              icon: <Zap className="h-6 w-6 text-amber-500" />,
              title: "AI Triage",
              desc: "Gemini AI instantly categorizes and severity-rates every report automatically.",
            },
            {
              icon: <Users className="h-6 w-6 text-indigo-600" />,
              title: "Community Verify",
              desc: "Neighbors upvote real issues, boosting their priority for faster municipal action.",
            },
          ].map((feat) => (
            <div
              key={feat.title}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className="h-11 w-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                {feat.icon}
              </div>
              <h3 className="font-extrabold text-gray-900 text-base">{feat.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
