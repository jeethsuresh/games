"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { games } from "./games/games.config";

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Client-side redirect that works with service workers
    // This ensures the redirect works even when served from cache
    if (games.length > 0) {
      router.replace(`/games/${games[0].id}`);
    }
  }, [router]);
  
  if (games.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>No games available</p>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Redirecting...</p>
    </div>
  );
}

