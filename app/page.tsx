import { redirect } from "next/navigation";
import { games } from "./games/games.config";

export default function Home() {
  // Redirect to the first game
  if (games.length > 0) {
    redirect(`/games/${games[0].id}`);
  }
  
  return (
    <div className="flex items-center justify-center h-screen">
      <p>No games available</p>
    </div>
  );
}

