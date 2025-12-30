"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

const WORDS = [
  "APPLE", "BEACH", "CHAIR", "DANCE", "EARTH",
  "FLAME", "GLASS", "HEART", "IMAGE", "JAZZY",
  "KNIFE", "LEMON", "MUSIC", "NIGHT", "OCEAN",
  "PEACE", "QUICK", "RIVER", "SMILE", "TIGER",
  "UNITY", "VALUE", "WATER", "XENON", "YOUTH", "ZEBRA"
];

export function WordleGame() {
  const [targetWord] = useState(() => 
    WORDS[Math.floor(Math.random() * WORDS.length)]
  );
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const guess = currentGuess.toUpperCase().trim();
    if (guess.length !== 5) {
      alert("Please enter a 5-letter word!");
      return;
    }
    if (!WORDS.includes(guess)) {
      alert("Not a valid word! Try another.");
      return;
    }
    if (guesses.includes(guess)) {
      alert("You've already tried this word!");
      return;
    }

    const newGuesses = [...guesses, guess];
    setGuesses(newGuesses);
    setCurrentGuess("");

    if (guess === targetWord) {
      setGameOver(true);
    } else if (newGuesses.length >= 6) {
      setGameOver(true);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && currentGuess.length === 5) {
      e.preventDefault();
      const guess = currentGuess.toUpperCase().trim();
      if (guess.length === 5 && WORDS.includes(guess) && !guesses.includes(guess)) {
        const newGuesses = [...guesses, guess];
        setGuesses(newGuesses);
        setCurrentGuess("");

        if (guess === targetWord) {
          setGameOver(true);
        } else if (newGuesses.length >= 6) {
          setGameOver(true);
        }
      } else if (guess.length !== 5) {
        alert("Please enter a 5-letter word!");
      } else if (!WORDS.includes(guess)) {
        alert("Not a valid word! Try another.");
      } else if (guesses.includes(guess)) {
        alert("You've already tried this word!");
      }
    }
  };

  const getLetterColor = (letter: string, position: number, guess: string) => {
    if (targetWord[position] === letter) return "bg-green-500";
    if (targetWord.includes(letter)) return "bg-yellow-500";
    return "bg-gray-500";
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Wordle</h1>
      
      <div className="space-y-2 mb-8">
        {Array.from({ length: 6 }).map((_, rowIndex) => {
          const guess = guesses[rowIndex] || "";
          return (
            <div key={rowIndex} className="flex gap-2 justify-center">
              {Array.from({ length: 5 }).map((_, colIndex) => {
                const letter = guess[colIndex] || "";
                const color = guess
                  ? getLetterColor(letter, colIndex, guess)
                  : "bg-gray-200";
                return (
                  <div
                    key={colIndex}
                    className={`w-16 h-16 flex items-center justify-center text-2xl font-bold text-white rounded ${color}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {gameOver ? (
        <div className="text-center">
          <p className="text-xl mb-4">
            {guesses[guesses.length - 1] === targetWord
              ? "Congratulations! You won!"
              : `Game Over! The word was ${targetWord}`}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Play Again
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="text-center">
          <div className="flex gap-4 items-center justify-center">
            <input
              type="text"
              value={currentGuess}
              onChange={(e) => setCurrentGuess(e.target.value.toUpperCase().slice(0, 5))}
              onKeyDown={handleKeyDown}
              className="px-4 py-2 text-2xl text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 uppercase w-48"
              maxLength={5}
              autoFocus
              disabled={gameOver}
              placeholder="Enter word"
            />
            <button
              type="submit"
              disabled={gameOver || currentGuess.length !== 5}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Guess
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {currentGuess.length}/5 letters
          </p>
        </form>
      )}
    </div>
  );
}

