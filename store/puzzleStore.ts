import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getDailyPuzzleDate } from "@/utils/dailyPuzzle";

interface PuzzleStore {
  dailyMode: boolean;
  selectedDate: string;
  setDailyMode: (mode: boolean) => void;
  setSelectedDate: (date: string) => void;
}

export const usePuzzleStore = create<PuzzleStore>()(
  persist(
    (set) => ({
      dailyMode: true,
      selectedDate: getDailyPuzzleDate(),
      setDailyMode: (mode) => set({ dailyMode: mode }),
      setSelectedDate: (date) => set({ selectedDate: date }),
    }),
    {
      name: "puzzle-settings",
    }
  )
);


