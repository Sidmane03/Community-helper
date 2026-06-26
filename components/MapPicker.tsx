"use client";

import { useEffect, useRef } from "react";
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

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}

export default function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    fixLeafletIcon();

    if (!mapContainerRef.current) return;

    // Default center: use current coordinates or fallback to a default city (e.g. Pune/Baramati region from user screenshot)
    const initialLat = latitude || 20.661000;
    const initialLng = longitude || 77.028900;
    const zoom = latitude && longitude ? 15 : 12;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], zoom);
    mapRef.current = map;

    // Add openstreetmap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // If initial coordinates exist, place a marker
    if (latitude && longitude) {
      markerRef.current = L.marker([latitude, longitude]).addTo(map);
    }

    // Click handler to select location
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      onChange(parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6)));
    });

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update marker position and center map when latitude/longitude props change externally (e.g., Geolocation capture)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || latitude === null || longitude === null) return;

    const currentCenter = map.getCenter();
    const newPos: L.LatLngExpression = [latitude, longitude];

    // If marker already exists, update its position, otherwise create it
    if (markerRef.current) {
      markerRef.current.setLatLng(newPos);
    } else {
      markerRef.current = L.marker(newPos).addTo(map);
    }

    // Pan to the new location if it is far from current center
    if (currentCenter.lat.toFixed(4) !== latitude.toFixed(4) || currentCenter.lng.toFixed(4) !== longitude.toFixed(4)) {
      map.setView(newPos, 15);
    }
  }, [latitude, longitude]);

  return (
    <div className="relative">
      <div 
        ref={mapContainerRef} 
        className="h-64 w-full rounded-lg border border-gray-300 shadow-inner z-0" 
        style={{ minHeight: "260px" }}
      />
      <div className="absolute bottom-2 left-2 bg-white px-2 py-1 text-[10px] font-semibold text-gray-700 rounded shadow border border-gray-200 pointer-events-none z-[1000]">
        Tap anywhere on the map to select coordinates
      </div>
    </div>
  );
}
