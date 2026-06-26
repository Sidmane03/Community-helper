"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Workaround for Leaflet marker icon issue in Webpack/Next.js
const fixLeafletIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  });
};

interface Issue {
  id: string;
  description: string;
  image_url: string;
  latitude: number;
  longitude: number;
  category: string;
  severity: string;
  status: string;
}

interface DiscoverMapProps {
  issues: Issue[];
}

export default function DiscoverMap({ issues }: DiscoverMapProps) {
  useEffect(() => {
    fixLeafletIcon();
  }, []);

  // Default center of map: use first issue's coords or fallback to a general region
  const defaultCenter: [number, number] = issues.length > 0 
    ? [issues[0].latitude, issues[0].longitude] 
    : [20.661000, 77.028900];

  return (
    <div className="h-[600px] w-full rounded-xl border border-gray-200 overflow-hidden shadow-sm z-0">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="h-full w-full"
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {issues.map((issue) => (
          <Marker 
            key={issue.id} 
            position={[issue.latitude, issue.longitude]}
          >
            <Popup className="custom-popup">
              <div className="max-w-[200px] p-1 flex flex-col gap-2">
                {issue.image_url && (
                  <img
                    src={issue.image_url}
                    alt={issue.category}
                    className="w-full h-24 object-cover rounded"
                  />
                )}
                <div>
                  <h3 className="font-bold text-sm text-gray-900 capitalize">
                    {issue.category.replace("_", " ")}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                    {issue.description}
                  </p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 border border-teal-100 text-teal-700 capitalize">
                    {issue.status}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
