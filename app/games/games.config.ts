import { NumberPuzzle } from "./number-puzzle/NumberPuzzle";
import { WordleGame } from "./wordle/WordleGame";
import { WheelOfFortune } from "./wheel-of-fortune/WheelOfFortune";

export interface Game {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType;
}

export const games: Game[] = [
  {
    id: "number-puzzle",
    name: "Number Golf",
    description: "Use numbers and operations to reach a target",
    component: NumberPuzzle,
  },
  {
    id: "wheel-of-fortune",
    name: "Wheel of Fortune",
    description: "Spin the wheel, reveal letters, and guess the word",
    component: WheelOfFortune,
  },
  // {
  //   id: "wordle",
  //   name: "Wordle",
  //   description: "Guess the 5-letter word",
  //   component: WordleGame,
  // },
];

