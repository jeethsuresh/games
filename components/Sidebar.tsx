"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { games } from "@/app/games/games.config";
import { getDailyPuzzleDate } from "@/utils/dailyPuzzle";
import { usePuzzleStore } from "@/store/puzzleStore";

function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", { 
    weekday: "short", 
    year: "numeric", 
    month: "short", 
    day: "numeric" 
  });
}

function getPreviousDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNextDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { dailyMode, selectedDate, setDailyMode, setSelectedDate } = usePuzzleStore();
  const [isOpen, setIsOpen] = useState(false);

  const toggleDailyMode = () => {
    setDailyMode(!dailyMode);
    // Reload the page to regenerate puzzle with new mode
    window.location.reload();
  };

  const changeDate = (newDate: string) => {
    setSelectedDate(newDate);
    // Reload the page to regenerate puzzle with new date
    window.location.reload();
  };

  const goToPreviousDate = () => {
    const prevDate = getPreviousDate(selectedDate);
    changeDate(prevDate);
  };

  const goToNextDate = () => {
    const nextDate = getNextDate(selectedDate);
    const today = getDailyPuzzleDate();
    // Don't allow going to future dates beyond today
    if (nextDate <= today) {
      changeDate(nextDate);
    }
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
            <label className="flex items-center justify-between cursor-pointer mb-3">
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
            
            {/* Date Selection Controls - only show when daily mode is enabled */}
            {dailyMode && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-400 mb-2">Select Puzzle Date</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPreviousDate}
                    className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-white"
                    aria-label="Previous day"
                    title="Previous day"
                  >
                    ←
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => changeDate(e.target.value)}
                    max={getDailyPuzzleDate()}
                    className="flex-1 px-2 py-1.5 bg-gray-700 text-white rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Select date"
                  />
                  <button
                    onClick={goToNextDate}
                    disabled={selectedDate >= getDailyPuzzleDate()}
                    className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Next day"
                    title="Next day"
                  >
                    →
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {formatDateForDisplay(selectedDate)}
                </div>
              </div>
            )}
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

