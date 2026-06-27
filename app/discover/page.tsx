"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import {
  List,
  Map,
  Loader2,
  AlertCircle,
  Plus,
  Filter,
  CheckCircle2,
  ThumbsUp,
  Clock,
  AlertTriangle,
  Flame,
  Droplets,
  Zap,
  Trash2,
  Building,
  MoreHorizontal,
  X,
  ChevronDown,
  TrendingUp,
  Users,
  ShieldCheck,
  Search,
} from "lucide-react";
import { verifyIssue } from "@/components/actions/verifyIssue";

// SSR-safe dynamic map import
const DiscoverMap = dynamic(() => import("@/components/DiscoverMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[580px] w-full rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 flex flex-col items-center justify-center gap-3">
      <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
      <p className="text-sm font-semibold text-teal-700">Loading Map...</p>
    </div>
  ),
});

/* ─── Types ─────────────────────────────────────────────────── */
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
  verifications_count?: number;
}

/* ─── Config Maps ────────────────────────────────────────────── */
const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  pothole:          { label: "Pothole",          icon: <Flame className="h-3.5 w-3.5" />,       color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200" },
  water_leak:       { label: "Water Leak",       icon: <Droplets className="h-3.5 w-3.5" />,   color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200"   },
  streetlight:      { label: "Streetlight",      icon: <Zap className="h-3.5 w-3.5" />,        color: "text-yellow-700", bg: "bg-yellow-50",  border: "border-yellow-200" },
  illegal_dumping:  { label: "Illegal Dumping",  icon: <Trash2 className="h-3.5 w-3.5" />,     color: "text-red-700",    bg: "bg-red-50",     border: "border-red-200"    },
  damaged_property: { label: "Damaged Property", icon: <Building className="h-3.5 w-3.5" />,   color: "text-purple-700", bg: "bg-purple-50",  border: "border-purple-200" },
  other:            { label: "Other",            icon: <MoreHorizontal className="h-3.5 w-3.5" />, color: "text-gray-700", bg: "bg-gray-100", border: "border-gray-200"    },
};

const severityConfig: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  high:   { color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    dot: "bg-red-500"    },
  medium: { color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  dot: "bg-amber-500"  },
  low:    { color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200",  dot: "bg-green-500"  },
};

const statusConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  reported:    { color: "text-slate-700",  bg: "bg-slate-100",  border: "border-slate-200",  label: "Reported"    },
  "in-review": { color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200",   label: "In Review"   },
  resolved:    { color: "text-green-700",  bg: "bg-green-50",   border: "border-green-200",  label: "Resolved"    },
  in_progress: { color: "text-indigo-700", bg: "bg-indigo-50",  border: "border-indigo-200", label: "In Progress" },
};

function getStatusCfg(s: string) {
  return statusConfig[s?.toLowerCase()] ?? statusConfig.reported;
}
function getSeverityCfg(s: string) {
  return severityConfig[s?.toLowerCase()] ?? severityConfig.medium;
}
function getCategoryCfg(c: string) {
  return categoryConfig[c?.toLowerCase()] ?? categoryConfig.other;
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl p-4 border ${color} flex items-start gap-3 flex-1 min-w-[130px]`}>
      <div className="mt-0.5 opacity-80">{icon}</div>
      <div>
        <p className="text-2xl font-extrabold leading-none">{value}</p>
        <p className="text-xs font-semibold mt-0.5 opacity-70">{label}</p>
        {sub && <p className="text-xs opacity-50 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Issue Card ─────────────────────────────────────────────── */
function IssueCard({ issue, onVerify }: { issue: Issue; onVerify: (id: string) => void }) {
  const cat = getCategoryCfg(issue.category);
  const sev = getSeverityCfg(issue.severity);
  const sta = getStatusCfg(issue.status);

  return (
    <article className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      {/* Image */}
      <div className="relative h-44 w-full bg-gray-100 overflow-hidden flex-shrink-0">
        {issue.image_url ? (
          <img
            src={issue.image_url}
            alt={cat.label}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <AlertCircle className="h-10 w-10 text-gray-300" />
          </div>
        )}
        {/* Severity badge overlay */}
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-sm ${sev.bg} ${sev.color} ${sev.border}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
          {issue.severity}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-grow">
        {/* Category + Status row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cat.bg} ${cat.color} ${cat.border}`}>
            {cat.icon}
            {cat.label}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ml-auto ${sta.bg} ${sta.color} ${sta.border}`}>
            {issue.status === "resolved"
              ? <CheckCircle2 className="h-3 w-3 mr-1" />
              : <Clock className="h-3 w-3 mr-1" />}
            {sta.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 flex-grow">
          {issue.description}
        </p>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(issue.created_at)}
          </span>
          {/* Verify button */}
          <button
            onClick={() => onVerify(issue.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 hover:border-teal-300 transition-all active:scale-95"
          >
            <ThumbsUp className="h-3 w-3" />
            <span>{issue.verifications_count ?? 0}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

/* ─── Filter Pill ────────────────────────────────────────────── */
function FilterPill({
  label, active, onClick, icon,
}: {
  label: string; active: boolean; onClick: () => void; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
        active
          ? "bg-teal-600 text-white border-teal-600 shadow-sm"
          : "bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:text-teal-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function DiscoverPage() {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIssues() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("Issue")
          .select("id, image_url, description, latitude, longitude, category, severity, status, created_at, verifications_count")
          .order("created_at", { ascending: false });

        if (error) throw error;
        // Normalize verifications_count to 0 if column doesn't exist
        const normalized = (data ?? []).map((i) => ({
          ...i,
          verifications_count: i.verifications_count ?? 0,
        }));
        setIssues(normalized);
      } catch (err: any) {
        setError("Failed to load community issues. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchIssues();
  }, []);

  // Optimistic verify handler
  function handleVerify(id: string) {
    setVerifyingId(id);
    setIssues((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, verifications_count: (i.verifications_count ?? 0) + 1 } : i
      )
    );

    startTransition(async () => {
      const res = await verifyIssue(id);
      if (!res.success) {
        // rollback
        setIssues((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, verifications_count: Math.max(0, (i.verifications_count ?? 1) - 1) } : i
          )
        );
      }
      setVerifyingId(null);
    });
  }

  // Stats
  const totalIssues = issues.length;
  const resolvedCount = issues.filter((i) => i.status?.toLowerCase() === "resolved").length;
  const highCount = issues.filter((i) => i.severity?.toLowerCase() === "high").length;
  const totalVerifications = issues.reduce((acc, i) => acc + (i.verifications_count ?? 0), 0);

  // Filtered issues
  const filtered = issues.filter((i) => {
    const matchSearch =
      !search ||
      i.description?.toLowerCase().includes(search.toLowerCase()) ||
      i.category?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || i.category === filterCategory;
    const matchSev = !filterSeverity || i.severity?.toLowerCase() === filterSeverity;
    const matchSta = !filterStatus || i.status?.toLowerCase() === filterStatus;
    return matchSearch && matchCat && matchSev && matchSta;
  });

  const activeFilterCount = [filterCategory, filterSeverity, filterStatus].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero Header ────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                Community Issues
              </h1>
              <p className="mt-1 text-base text-gray-500 font-medium max-w-lg">
                Browse, verify, and track every reported issue in your neighborhood.
              </p>
            </div>
            <Link
              href="/report"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md hover:shadow-teal-200 transition-all duration-150 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Report an Issue
            </Link>
          </div>

          {/* ── Stats Row ───────────────────────────────────── */}
          <div className="flex flex-wrap gap-3 mt-6">
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-teal-600" />}
              label="Total Reports"
              value={totalIssues}
              color="bg-teal-50 border-teal-100 text-teal-900"
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
              label="Resolved"
              value={resolvedCount}
              sub={totalIssues ? `${Math.round((resolvedCount / totalIssues) * 100)}% of total` : ""}
              color="bg-green-50 border-green-100 text-green-900"
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
              label="High Severity"
              value={highCount}
              color="bg-red-50 border-red-100 text-red-900"
            />
            <StatCard
              icon={<ShieldCheck className="h-5 w-5 text-indigo-600" />}
              label="Verifications"
              value={totalVerifications}
              color="bg-indigo-50 border-indigo-100 text-indigo-900"
            />
          </div>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search */}
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by description or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder-gray-400 font-medium"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all shadow-sm ${
              showFilters || activeFilterCount > 0
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-white text-teal-700 text-xs font-extrabold">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>

          {/* View Toggle */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm ml-auto" role="tablist">
            <button
              role="tab"
              aria-selected={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold transition-all ${
                viewMode === "list" ? "bg-teal-600 text-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <List className="h-4 w-4" /> List
            </button>
            <button
              role="tab"
              aria-selected={viewMode === "map"}
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold transition-all border-l border-gray-200 ${
                viewMode === "map" ? "bg-teal-600 text-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <Map className="h-4 w-4" /> Map
            </button>
          </div>
        </div>

        {/* ── Filter Panels ──────────────────────────────────── */}
        {showFilters && (
          <div className="mt-3 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider w-full sm:w-16 shrink-0">Category</span>
              {Object.entries(categoryConfig).map(([key, c]) => (
                <FilterPill
                  key={key}
                  label={c.label}
                  icon={c.icon}
                  active={filterCategory === key}
                  onClick={() => setFilterCategory(filterCategory === key ? null : key)}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider w-full sm:w-16 shrink-0">Severity</span>
              {["high", "medium", "low"].map((sev) => (
                <FilterPill
                  key={sev}
                  label={sev.charAt(0).toUpperCase() + sev.slice(1)}
                  active={filterSeverity === sev}
                  onClick={() => setFilterSeverity(filterSeverity === sev ? null : sev)}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider w-full sm:w-16 shrink-0">Status</span>
              {Object.entries(statusConfig).map(([key, s]) => (
                <FilterPill
                  key={key}
                  label={s.label}
                  active={filterStatus === key}
                  onClick={() => setFilterStatus(filterStatus === key ? null : key)}
                />
              ))}
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilterCategory(null); setFilterSeverity(null); setFilterStatus(null); }}
                className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* ── Results label ─────────────────────────────────── */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-500">
            Showing <span className="text-gray-900">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "issue" : "issues"}
            {activeFilterCount > 0 || search ? " (filtered)" : ""}
          </p>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center gap-3">
            <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
            <span className="text-gray-500 font-semibold">Loading community data...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4" role="alert">
            <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800">Unable to load issues</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center py-16">
            <div className="h-20 w-20 rounded-full bg-teal-50 flex items-center justify-center mb-4">
              <AlertCircle className="h-10 w-10 text-teal-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {issues.length === 0 ? "No issues reported yet" : "No issues match your filters"}
            </h2>
            <p className="text-sm text-gray-500 max-w-sm mb-6">
              {issues.length === 0
                ? "Be the first to report a problem in your neighborhood!"
                : "Try adjusting or clearing your search and filters."}
            </p>
            {issues.length === 0 && (
              <Link
                href="/report"
                className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-md"
              >
                <Plus className="h-4 w-4" />
                Report an Issue
              </Link>
            )}
          </div>
        ) : viewMode === "list" ? (
          /* ── List Grid ─────────────────────────────────────── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((issue) => (
              <IssueCard key={issue.id} issue={issue} onVerify={handleVerify} />
            ))}
          </div>
        ) : (
          /* ── Map View ──────────────────────────────────────── */
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
            <DiscoverMap issues={filtered} />
            <div className="bg-white border-t border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 font-medium">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-500" /> High Severity</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-amber-400" /> Medium Severity</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-green-500" /> Low Severity</span>
                <span className="ml-auto text-xs">{filtered.length} pins on map</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
