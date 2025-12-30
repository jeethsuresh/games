"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { games } from "@/app/games/games.config";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-8">Games</h1>
        <nav className="space-y-2">
          {games.map((game) => {
            const isActive = pathname === `/games/${game.id}`;
            return (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <div className="font-semibold">{game.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {game.description}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

