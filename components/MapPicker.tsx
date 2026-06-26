"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Maximize2, Minimize2, Loader2 } from "lucide-react";

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

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    fixLeafletIcon();

    if (!mapContainerRef.current) return;

    // Default center: Pune/Baramati region
    const initialLat = latitude || 20.661000;
    const initialLng = longitude || 77.028900;
    const zoom = latitude && longitude ? 15 : 12;

    // Initialize map with attributionControl: false to remove OSM copyright footer
    const map = L.map(mapContainerRef.current, { 
      attributionControl: false 
    }).setView([initialLat, initialLng], zoom);
    
    mapRef.current = map;

    // Add openstreetmap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

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

  // Update marker position and center map when latitude/longitude props change externally
  useEffect(() => {
    const map = mapRef.current;
    if (!map || latitude === null || longitude === null) return;

    const currentCenter = map.getCenter();
    const newPos: L.LatLngExpression = [latitude, longitude];

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

  // Handle fullscreen toggle resize invalidate and map centering
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Invalidate size immediately
    map.invalidateSize({ animate: false });
    
    // Recenter map on active coordinates when toggling fullscreen
    if (latitude !== null && longitude !== null) {
      map.setView([latitude, longitude], 15);
    }

    // Invalidate size at multiple intervals to handle browser reflow delays
    const intervals = [50, 100, 200, 400, 800];
    const timers = intervals.map(delay => 
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize({ animate: false });
        }
      }, delay)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isFullscreen, latitude, longitude]);

  // GPS Locate inside map picker
  const handleLocate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!navigator.geolocation) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        onChange(
          parseFloat(position.coords.latitude.toFixed(6)),
          parseFloat(position.coords.longitude.toFixed(6))
        );
      },
      (error) => {
        setIsLocating(false);
        console.error("GPS map locating error:", error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFullscreenToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={isFullscreen ? "fixed inset-0 w-screen h-screen z-[9998] bg-white" : "relative"}>
      <div 
        ref={mapContainerRef} 
        className={isFullscreen 
          ? "w-full h-full z-0" 
          : "h-64 w-full rounded-lg border border-gray-300 shadow-inner z-0"
        }
        style={isFullscreen ? {} : { minHeight: "260px" }}
      />
      
      {/* Floating Controls at Top Right */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        {/* GPS Locate Button */}
        <button
          type="button"
          onClick={handleLocate}
          disabled={isLocating}
          title="Center on my location"
          className="w-10 h-10 bg-white border border-gray-200 shadow-md rounded-md flex items-center justify-center text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 min-h-[40px]"
        >
          {isLocating ? (
            <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
          ) : (
            <Navigation className="h-5 w-5 text-teal-700 fill-teal-50" />
          )}
        </button>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={handleFullscreenToggle}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen map"}
          className="w-10 h-10 bg-white border border-gray-200 shadow-md rounded-md flex items-center justify-center text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 min-h-[40px]"
        >
          {isFullscreen ? (
            <Minimize2 className="h-5 w-5 text-teal-700" />
          ) : (
            <Maximize2 className="h-5 w-5 text-teal-700" />
          )}
        </button>
      </div>

      {/* Floating Exit Button in Fullscreen Mode */}
      {isFullscreen && (
        <button
          type="button"
          onClick={() => setIsFullscreen(false)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-teal-700 hover:bg-teal-800 text-white font-bold px-6 py-3 rounded-full shadow-lg flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 min-h-[44px]"
        >
          <Minimize2 className="h-5 w-5" />
          Exit Map View
        </button>
      )}
    </div>
  );
}
