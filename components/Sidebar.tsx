"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { games } from "@/app/games/games.config";

export default function Sidebar() {
  const pathname = usePathname();
  const [dailyMode, setDailyMode] = useState(true); // Default to true
  const [isOpen, setIsOpen] = useState(false);

  // Load daily mode preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("dailyPuzzleMode");
    if (saved !== null) {
      setDailyMode(saved === "true");
    } else {
      // If no saved preference, default to true and save it
      setDailyMode(true);
      localStorage.setItem("dailyPuzzleMode", "true");
    }
  }, []);

  // Save daily mode preference to localStorage
  const toggleDailyMode = () => {
    const newValue = !dailyMode;
    setDailyMode(newValue);
    localStorage.setItem("dailyPuzzleMode", String(newValue));
    // Reload the page to regenerate puzzle with new mode
    window.location.reload();
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white h-screen overflow-y-auto transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="p-4 lg:p-6">
          <h1 className="text-xl lg:text-2xl font-bold mb-6 lg:mb-8">Games</h1>
        
          {/* Daily Puzzle Toggle */}
          <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-gray-800 rounded-lg">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-semibold text-xs lg:text-sm">Daily Puzzle</div>
                <div className="text-xs text-gray-400 mt-1">
                  Same puzzle for everyone
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={dailyMode}
                  onChange={toggleDailyMode}
                  className="sr-only"
                />
                <div
                  className={`w-12 h-6 lg:w-14 lg:h-7 rounded-full transition-colors ${
                    dailyMode ? "bg-blue-600" : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`w-5 h-5 lg:w-6 lg:h-6 bg-white rounded-full transition-transform mt-0.5 ${
                      dailyMode ? "translate-x-6 lg:translate-x-7" : "translate-x-1"
                    }`}
                  />
                </div>
              </div>
            </label>
          </div>

          <nav className="space-y-2">
            {games.map((game) => {
              const isActive = pathname === `/games/${game.id}`;
              return (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <div className="font-semibold text-sm lg:text-base">{game.name}</div>
                  <div className="text-xs lg:text-sm text-gray-400 mt-1">
                    {game.description}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}

