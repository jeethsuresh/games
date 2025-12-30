import { NumberPuzzle } from "./number-puzzle/NumberPuzzle";
import { WordleGame } from "./wordle/WordleGame";

export interface Game {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType;
}

export const games: Game[] = [
  {
    id: "number-puzzle",
    name: "Number Puzzle",
    description: "Use numbers and operations to reach a target",
    component: NumberPuzzle,
  },
  // {
  //   id: "wordle",
  //   name: "Wordle",
  //   description: "Guess the 5-letter word",
  //   component: WordleGame,
  // },
];

