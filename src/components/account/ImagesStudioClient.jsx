"use client";

import { useState } from "react";

const STUDIO_URL = "https://genai-app-9tripstudiopro-1-1778381730107-776396611651.us-central1.run.app";

export default function ImagesStudioClient() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="w-full bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {!loaded && (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Đang tải Images Studio...</p>
          </div>
        </div>
      )}
      <iframe
        src={STUDIO_URL}
        title="Images Studio"
        className={`w-full h-[80vh] min-h-[600px] border-0 ${loaded ? "block" : "hidden"}`}
        allow="clipboard-write; camera"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
