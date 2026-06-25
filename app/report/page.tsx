"use client";

import { useActionState, useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { reportIssue, ReportState } from "./actions";
import { Camera, MapPin, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ReportIssuePage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(reportIssue, {});

  // Authentication State
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setCheckingAuth(false);
    });
  }, []);

  // Form local state for client-side validations and geolocation
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [fileError, setFileError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Client-side image validation (5MB size, JPEG/PNG/WEBP formats)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    setImagePreview(null);

    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB validation
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileError("The file is too large. Maximum size allowed is 5MB.");
      e.target.value = ""; // Reset input
      return;
    }

    // Format validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setFileError("Invalid format. Please upload a JPEG, PNG, or WEBP image.");
      e.target.value = ""; // Reset input
      return;
    }

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Browser geolocation capture
  const handleGetLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        console.error("Geolocation error:", error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied. Please allow access in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Please try again.");
            break;
          default:
            setLocationError("Failed to retrieve location coordinates.");
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (fileError) return;

    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      formAction(formData);
    });
  };

  // Redirect to home page upon successful submission
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, router]);

  if (checkingAuth) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-teal-700" />
        <span className="ml-2 text-gray-600 font-medium">Checking authorization...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm flex flex-col items-center">
          <AlertCircle className="h-16 w-16 text-amber-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6 font-medium">
            You must be signed in to submit an issue report. Please log in or sign up first.
          </p>
          <div className="flex flex-col w-full gap-3">
            <Link
              href="/login"
              className="w-full inline-flex justify-center items-center px-4 py-3 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 min-h-[44px]"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="w-full inline-flex justify-center items-center px-4 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 min-h-[44px]"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white border-2 border-green-600 rounded-lg p-8 shadow-sm flex flex-col items-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Issue Reported successfully!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for helping improve our neighborhood. Redirecting you to the home page...
          </p>
          <Link
            href="/"
            className="w-full inline-flex justify-center items-center px-4 py-3 bg-teal-700 text-white font-semibold rounded-md hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 min-h-[44px]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center text-teal-700 hover:text-teal-900 font-semibold mb-6 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded min-h-[44px] px-2"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Home
      </Link>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">
          Report an Issue
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Submit photos and location details of neighborhood maintenance issues.
        </p>

        {/* Global Error Banner */}
        {state?.error && (
          <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6" role="alert">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-800 font-medium">{state.error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload Field */}
          <div>
            <label
              htmlFor="image-upload"
              className="block text-base font-bold text-gray-900 mb-1"
            >
              Upload Photo <span className="text-red-700">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Required. Only JPEG, PNG, or WEBP formats. Maximum file size 5MB.
            </p>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors relative">
              {imagePreview ? (
                <div className="w-full relative flex flex-col items-center">
                  <img
                    src={imagePreview}
                    alt="Uploaded issue preview"
                    className="max-h-48 rounded object-cover mb-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      const input = document.getElementById("image-upload") as HTMLInputElement;
                      if (input) input.value = "";
                    }}
                    className="text-xs text-red-700 hover:underline min-h-[44px] px-3 font-semibold"
                  >
                    Remove and choose another
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Camera className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                  <span className="block text-sm font-semibold text-teal-700 hover:underline cursor-pointer">
                    Choose file
                  </span>
                </div>
              )}

              <input
                id="image-upload"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                required
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Upload Photo of the Issue"
              />
            </div>

            {fileError && (
              <p className="mt-2 text-sm text-red-700 font-semibold flex items-center" role="alert">
                <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                {fileError}
              </p>
            )}
          </div>

          {/* Location Capture Field */}
          <div>
            <label className="block text-base font-bold text-gray-900 mb-1">
              Location Coordinates <span className="text-red-700">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Required. Use the capture button to automatically retrieve your current GPS coordinates.
            </p>

            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isLocating}
              className="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 shadow-sm text-base font-bold rounded-md text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 min-h-[44px] disabled:opacity-50 transition-colors"
            >
              {isLocating ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2 text-teal-700" />
                  Locating...
                </>
              ) : (
                <>
                  <MapPin className="h-5 w-5 mr-2 text-teal-700" />
                  Capture Geolocation
                </>
              )}
            </button>

            {locationError && (
              <p className="mt-2 text-sm text-red-700 font-semibold flex items-center" role="alert">
                <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                {locationError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label
                  htmlFor="latitude"
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  Latitude
                </label>
                <input
                  type="text"
                  id="latitude"
                  name="latitude"
                  value={latitude}
                  readOnly
                  required
                  placeholder="Not captured"
                  className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none cursor-default"
                />
              </div>
              <div>
                <label
                  htmlFor="longitude"
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  Longitude
                </label>
                <input
                  type="text"
                  id="longitude"
                  name="longitude"
                  value={longitude}
                  readOnly
                  required
                  placeholder="Not captured"
                  className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none cursor-default"
                />
              </div>
            </div>
          </div>

          {/* Description Field */}
          <div>
            <label
              htmlFor="description"
              className="block text-base font-bold text-gray-900 mb-1"
            >
              Describe the Issue <span className="text-red-700">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Explain the problem clearly (e.g., pothole details, damaged light, overflow location).
            </p>
            <textarea
              id="description"
              name="description"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a clear description of the issue..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending || !!fileError || !latitude || !longitude}
            className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-lg font-bold rounded-md text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Submitting Issue...
              </>
            ) : (
              "Submit Issue Report"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
