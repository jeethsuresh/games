/**
 * Get the current day in Toronto time, resetting at 3am
 * Returns an ISO date string (YYYY-MM-DD) for the current puzzle day
 */
export function getDailyPuzzleDate(): string {
  // Get current time in Toronto timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === "year")?.value || "";
  const month = parts.find(p => p.type === "month")?.value || "";
  const day = parts.find(p => p.type === "day")?.value || "";
  const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
  
  // If it's before 3am, use yesterday's date
  let puzzleDate = new Date(`${year}-${month}-${day}T00:00:00`);
  if (hour < 3) {
    puzzleDate.setDate(puzzleDate.getDate() - 1);
  }
  
  // Return ISO date string (YYYY-MM-DD)
  const puzzleYear = puzzleDate.getFullYear();
  const puzzleMonth = String(puzzleDate.getMonth() + 1).padStart(2, "0");
  const puzzleDay = String(puzzleDate.getDate()).padStart(2, "0");
  
  return `${puzzleYear}-${puzzleMonth}-${puzzleDay}`;
}

/**
 * Seeded random number generator (Mulberry32)
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    // Convert string seed to number using hash
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    this.seed = hash;
  }

  next(): number {
    // Mulberry32 algorithm
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  // Generate integer between min (inclusive) and max (exclusive)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }
}

