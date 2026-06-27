"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Issue {
  id: string;
  description: string;
  image_url: string;
  latitude: number;
  longitude: number;
  category: string;
  severity: string;
  status: string;
  verifications_count?: number;
}

interface DiscoverMapProps {
  issues: Issue[];
}

// Custom SVG pin icon factory per severity
function createSeverityIcon(severity: string) {
  const colors: Record<string, { bg: string; border: string; shadow: string }> = {
    high:   { bg: "#ef4444", border: "#991b1b", shadow: "#fca5a5" },
    medium: { bg: "#f59e0b", border: "#92400e", shadow: "#fde68a" },
    low:    { bg: "#22c55e", border: "#14532d", shadow: "#bbf7d0" },
  };

  const c = colors[severity?.toLowerCase()] ?? colors.medium;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
      <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="${c.shadow}" flood-opacity="0.6"/>
      </filter>
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10.5 16 28 16 28S32 26.5 32 16C32 7.163 24.837 0 16 0z"
            fill="${c.bg}" stroke="${c.border}" stroke-width="1.5" filter="url(#sh)"/>
      <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -44],
  });
}

const categoryLabels: Record<string, string> = {
  pothole: "🕳️ Pothole",
  water_leak: "💧 Water Leak",
  streetlight: "💡 Streetlight",
  illegal_dumping: "🗑️ Illegal Dumping",
  damaged_property: "🏚️ Damaged Property",
  other: "📌 Other",
};

const severityColors: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

function RecenterButton({ issues }: { issues: Issue[] }) {
  const map = useMap();
  if (issues.length === 0) return null;

  return (
    <button
      style={{
        position: "absolute",
        bottom: "80px",
        right: "10px",
        zIndex: 1000,
        background: "white",
        border: "2px solid rgba(0,0,0,0.2)",
        borderRadius: "4px",
        padding: "6px 8px",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: 700,
        color: "#0f766e",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
      }}
      onClick={() => {
        const bounds = L.latLngBounds(issues.map((i) => [i.latitude, i.longitude]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }}
    >
      Fit All
    </button>
  );
}

export default function DiscoverMap({ issues }: DiscoverMapProps) {
  useEffect(() => {
    // Fix Leaflet icon resolution in Next.js/Webpack
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  const defaultCenter: [number, number] =
    issues.length > 0 ? [issues[0].latitude, issues[0].longitude] : [20.661, 77.028];

  return (
    <div className="relative h-[580px] w-full rounded-2xl overflow-hidden shadow-lg" style={{ zIndex: 0 }}>
      <MapContainer
        center={defaultCenter}
        zoom={issues.length > 1 ? 12 : 14}
        className="h-full w-full"
        attributionControl={false}
        zoomControl={true}
      >
        {/* Clean CartoDB Positron basemap */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {issues.map((issue) => (
          <Marker
            key={issue.id}
            position={[issue.latitude, issue.longitude]}
            icon={createSeverityIcon(issue.severity)}
          >
            <Popup minWidth={220} maxWidth={260} className="premium-popup">
              <div style={{ fontFamily: "Inter, system-ui, sans-serif", padding: "4px" }}>
                {issue.image_url && (
                  <img
                    src={issue.image_url}
                    alt={issue.category}
                    style={{
                      width: "100%",
                      height: "100px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      marginBottom: "8px",
                    }}
                  />
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#0f766e",
                      background: "#f0fdf9",
                      border: "1px solid #99f6e4",
                      borderRadius: "999px",
                      padding: "2px 8px",
                    }}
                  >
                    {categoryLabels[issue.category] ?? issue.category}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "white",
                      background: severityColors[issue.severity?.toLowerCase()] ?? "#6b7280",
                      borderRadius: "999px",
                      padding: "2px 8px",
                      textTransform: "capitalize",
                    }}
                  >
                    {issue.severity}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#374151",
                    lineHeight: "1.5",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    marginBottom: "8px",
                  }}
                >
                  {issue.description}
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "6px",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      background: issue.status === "resolved" ? "#dcfce7" : "#fef3c7",
                      color: issue.status === "resolved" ? "#166534" : "#92400e",
                      borderRadius: "999px",
                      padding: "2px 8px",
                      textTransform: "capitalize",
                    }}
                  >
                    {issue.status}
                  </span>
                  {(issue.verifications_count ?? 0) > 0 && (
                    <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>
                      ✅ {issue.verifications_count} verified
                    </span>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        <RecenterButton issues={issues} />
      </MapContainer>
    </div>
  );
}
