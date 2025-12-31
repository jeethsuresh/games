import { notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { games } from "../games.config";

export async function generateStaticParams() {
  return games.map((game) => ({
    gameId: game.id,
  }));
}

export default function GamePage({
  params,
}: {
  params: { gameId: string };
}) {
  const game = games.find((g) => g.id === params.gameId);

  if (!game) {
    notFound();
  }

  const GameComponent = game.component;

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 pt-16 lg:pt-0">
        <div className="h-full p-4 sm:p-6 lg:p-8">
          <GameComponent />
        </div>
      </main>
    </div>
  );
}

