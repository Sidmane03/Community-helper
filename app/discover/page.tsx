"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { List, Map, Loader2, AlertCircle, Plus } from "lucide-react";

// Dynamically import the map view component to avoid SSR window-not-defined crashes
const DiscoverMap = dynamic(() => import("@/components/DiscoverMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-gray-50 border border-gray-200 rounded-xl flex flex-col items-center justify-center font-semibold text-gray-500 shadow-inner">
      <Loader2 className="animate-spin h-8 w-8 text-teal-700 mb-2" />
      Loading Map view...
    </div>
  ),
});

interface Issue {
  id: string;
  description: string;
  image_url: string;
  latitude: number;
  longitude: number;
  category: string;
  severity: string;
  status: string;
  created_at?: string;
}

export default function DiscoverPage() {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIssues() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("Issue")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setIssues(data || []);
      } catch (err: any) {
        console.error("Error fetching issues:", err);
        setError("Failed to load community issues. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchIssues();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Discover Issues
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Browse and view community-reported issues in your neighborhood.
          </p>
        </div>

        {/* Action Button */}
        <Link
          href="/report"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors min-h-[44px]"
        >
          <Plus className="h-5 w-5 mr-1" />
          Report Issue
        </Link>
      </div>

      {/* Toggle View Options Bar */}
      <div className="flex justify-between items-center bg-white border border-gray-200 rounded-lg p-3 mb-6 shadow-sm">
        <span className="text-sm font-bold text-gray-700">
          Showing {issues.length} {issues.length === 1 ? "issue" : "issues"}
        </span>

        {/* Accessible Toggle Button Group */}
        <div className="flex items-center border border-gray-300 rounded-md p-1 bg-gray-50" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "list"}
            onClick={() => setViewMode("list")}
            className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-bold transition-all min-h-[36px] ${
              viewMode === "list"
                ? "bg-white text-teal-700 shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <List className="h-4 w-4 mr-1.5" />
            List
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "map"}
            onClick={() => setViewMode("map")}
            className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-bold transition-all min-h-[36px] ${
              viewMode === "map"
                ? "bg-white text-teal-700 shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Map className="h-4 w-4 mr-1.5" />
            Map
          </button>
        </div>
      </div>

      {/* Main View Block Content */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-teal-700 mr-2" />
          <span className="text-gray-600 font-bold">Loading issues...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-md shadow-sm" role="alert">
          <div className="flex">
            <AlertCircle className="h-6 w-6 text-red-600 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-800 font-semibold">{error}</p>
          </div>
        </div>
      ) : issues.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">No issues reported yet</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Be the first to report an infrastructure problem in your neighborhood to get it resolved!
          </p>
          <Link
            href="/report"
            className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-md font-bold hover:bg-teal-700 transition-colors"
          >
            Report an Issue Now
          </Link>
        </div>
      ) : viewMode === "list" ? (
        <IssueListBlock issues={issues} />
      ) : (
        <IssueMapBlock issues={issues} />
      )}
    </div>
  );
}

/* ==========================================
   Localized View Sub-components (Separation of Concerns)
   ========================================== */

// 1. Structural List View Block
function IssueListBlock({ issues }: { issues: Issue[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {issues.map((issue) => (
        <div 
          key={issue.id} 
          className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow"
        >
          {/* Card Image header */}
          <div className="relative h-48 w-full bg-gray-100 border-b border-gray-200">
            {issue.image_url ? (
              <img
                src={issue.image_url}
                alt={issue.category}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No image available
              </div>
            )}
          </div>

          {/* Card Body */}
          <div className="p-5 flex-grow flex flex-col">
            <div className="flex flex-wrap gap-2 mb-3">
              {/* Category Tag */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 border border-teal-100 text-teal-800 capitalize">
                {issue.category.replace("_", " ")}
              </span>

              {/* Severity Tag */}
              <SeverityTag severity={issue.severity} />

              {/* Status Tag */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 border border-gray-200 text-gray-800 capitalize ml-auto">
                {issue.status}
              </span>
            </div>

            <p className="text-base text-gray-700 font-medium line-clamp-3 mb-4 flex-grow">
              {issue.description}
            </p>

            {/* Coordinates / Details footer */}
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-xs text-gray-500 font-semibold">
              <span className="flex items-center">
                <Map className="h-3.5 w-3.5 mr-1 text-gray-400" />
                Lat: {issue.latitude.toFixed(4)}, Lng: {issue.longitude.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 2. Functional Map View Block (Wraps dynamically loaded map)
function IssueMapBlock({ issues }: { issues: Issue[] }) {
  return (
    <div className="relative w-full bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
      <DiscoverMap issues={issues} />
    </div>
  );
}

// Helper Severity styling tag component
function SeverityTag({ severity }: { severity: string }) {
  const sev = severity.toLowerCase();

  let styles = "bg-gray-100 text-gray-800 border-gray-200";
  if (sev === "low") {
    styles = "bg-green-50 text-green-800 border-green-100";
  } else if (sev === "medium") {
    styles = "bg-amber-50 text-amber-800 border-amber-100";
  } else if (sev === "high") {
    styles = "bg-red-50 text-red-800 border-red-100";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles} capitalize`}>
      {severity}
    </span>
  );
}
