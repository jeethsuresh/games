"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { getDailyPuzzleDate, SeededRandom, deterministicShuffle } from "@/utils/dailyPuzzle";
import { usePuzzleStore } from "@/store/puzzleStore";

interface NumberWithState {
  value: number;
  used: boolean;
}

interface GameState {
  numbers: NumberWithState[];
  history: string[];
  distanceEmojis: string[];
}

interface SavedGameState {
  numbers: NumberWithState[];
  history: string[];
  distanceEmojis: string[];
  elapsedTime: number;
  gameEnded: boolean;
  target: number;
  puzzleDate: string; // For daily mode - to check if it's a new day
  dailyMode: boolean;
  solution: SolutionStep[]; // Store the solution for this puzzle
  previousStates: GameState[]; // Store undo history
}

interface SolutionStep {
  a: number;
  b: number;
  op: string;
  result: number;
}

function calculateResult(a: number, b: number, op: string): number | null {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return Math.max(a, b) - Math.min(a, b);
    case "×":
      return a * b;
    case "÷":
      const dividend = Math.max(a, b);
      const divisor = Math.min(a, b);
      if (divisor === 0 || dividend % divisor !== 0) {
        return null;
      }
      return dividend / divisor;
    default:
      return null;
  }
}

function solvePuzzle(numbers: number[], target: number): SolutionStep[] | null {
  // Memoization cache: key is sorted numbers array, value is solution or null
  const memo = new Map<string, SolutionStep[] | null>();

  function solveRecursive(nums: number[]): SolutionStep[] | null {
    // Base case: if we have the target, we're done
    if (nums.includes(target)) {
      return [];
    }

    // Base case: if only one number remains and it's not the target, no solution
    if (nums.length === 1) {
      return null;
    }

    // Create a key for memoization (sorted array)
    const key = [...nums].sort((a, b) => a - b).join(",");
    const cached = memo.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // Try all pairs of numbers
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const a = nums[i];
        const b = nums[j];
        const remaining = nums.filter((_, idx) => idx !== i && idx !== j);

        // Try all operations
        for (const op of ["+", "−", "×", "÷"]) {
          const result = calculateResult(a, b, op);
          if (result === null || result <= 0) continue; // Skip invalid operations

          const newNums = [...remaining, result];
          const solution = solveRecursive(newNums);

          if (solution !== null) {
            const step: SolutionStep = {
              a: Math.max(a, b),
              b: Math.min(a, b),
              op,
              result,
            };
            memo.set(key, [step, ...solution]);
            return [step, ...solution];
          }
        }
      }
    }

    memo.set(key, null);
    return null;
  }

  return solveRecursive(numbers);
}

function generateSolvablePuzzle(seed: string): { numbers: number[]; target: number; solution: SolutionStep[] } {
  const maxAttempts = 100;
  const rng = new SeededRandom(seed);
  
  // Helper function to get random number
  const randomInt = (min: number, max: number) => rng.nextInt(min, max);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const large = [25, 50, 75, 100];
    const small = Array.from({ length: 4 }, () => randomInt(1, 11)); // 1-10 inclusive
    // Deterministically shuffle and select 2 large numbers
    const shuffledLarge = deterministicShuffle(large, rng);
    const selectedLarge = shuffledLarge.slice(0, 2);
    const numbers = deterministicShuffle([...selectedLarge, ...small], rng);
    const target = randomInt(100, 1000); // 100-999 inclusive
    
    const solution = solvePuzzle(numbers, target);
    if (solution !== null) {
      return { numbers, target, solution };
    }
  }

  // Fallback: return a puzzle we know works
  const fallbackNumbers = [25, 50, 1, 2, 3, 4];
  const fallbackTarget = 100;
  const fallbackSolution = solvePuzzle(fallbackNumbers, fallbackTarget);
  return {
    numbers: fallbackNumbers,
    target: fallbackTarget,
    solution: fallbackSolution || [],
  };
}

function getRatingEmoji(distance: number): string {
  if (distance === 0) return "💯";
  if (distance >= 1 && distance < 10) return "👑";
  if (distance >= 10 && distance < 50) return "🤩";
  if (distance >= 50 && distance < 100) return "🧐";
  return "😬";
}


function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", { 
    weekday: "short", 
    year: "numeric", 
    month: "short", 
    day: "numeric" 
  });
}

export function NumberPuzzle() {
  const { dailyMode, selectedDate, setSelectedDate } = usePuzzleStore();
  const [puzzleData, setPuzzleData] = useState<{ numbers: number[]; target: number; solution: SolutionStep[] } | null>(null);
  const [target, setTarget] = useState(0);
  const [solution, setSolution] = useState<SolutionStep[]>([]);
  const [showSolution, setShowSolution] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [numbers, setNumbers] = useState<NumberWithState[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [distanceEmojis, setDistanceEmojis] = useState<string[]>([]);
  const [selectedNumberIndex, setSelectedNumberIndex] = useState<number | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [previousStates, setPreviousStates] = useState<GameState[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCheckedDateRef = useRef(false);

  // Check and update to latest daily puzzle date on first load if daily mode is on
  useEffect(() => {
    if (!hasCheckedDateRef.current && dailyMode) {
      hasCheckedDateRef.current = true;
      const currentDailyDate = getDailyPuzzleDate();
      if (selectedDate !== currentDailyDate) {
        setSelectedDate(currentDailyDate);
      }
    }
  }, [dailyMode, selectedDate, setSelectedDate]);

  // Load game state from localStorage for a specific date
  const loadGameState = (date: string | undefined): SavedGameState | null => {
    try {
      // Use date-specific key: numberPuzzleState_YYYY-MM-DD for daily mode, numberPuzzleState_random for random
      const storageKey = date ? `numberPuzzleState_${date}` : "numberPuzzleState_random";
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;
      
      const state: SavedGameState = JSON.parse(saved);
      return state;
    } catch (e) {
      return null;
    }
  };

  // Initialize puzzle only on client side to avoid hydration mismatch
  useEffect(() => {
    if (!puzzleData) {
      // Get seed: use selectedDate for daily mode, or generate a timestamp-based seed for random mode
      const seed = dailyMode 
        ? selectedDate 
        : `random_${Date.now()}`;
      
      // Try to load saved state for this specific date
      const savedState = loadGameState(dailyMode ? selectedDate : undefined);
      
      if (savedState && savedState.dailyMode === dailyMode) {
        // Restore saved state (including solution)
        const generated = generateSolvablePuzzle(seed);
        setPuzzleData(generated);
        setTarget(savedState.target);
        setSolution(savedState.solution || generated.solution); // Use saved solution if available
        setNumbers(savedState.numbers);
        setHistory(savedState.history);
        setDistanceEmojis(savedState.distanceEmojis);
        setElapsedTime(savedState.elapsedTime);
        setGameEnded(savedState.gameEnded);
        setPreviousStates(savedState.previousStates || []); // Restore undo history
      } else {
        // No saved state for this date, generate new puzzle
        const generated = generateSolvablePuzzle(seed);
        setPuzzleData(generated);
        setTarget(generated.target);
        setSolution(generated.solution);
        setNumbers(generated.numbers.map((value) => ({ value, used: false })));
      }
    }
  }, [puzzleData, dailyMode, selectedDate]);

  // Listen for date/mode changes in Zustand store
  useEffect(() => {
    // When date or mode changes, reload the puzzle
    if (puzzleData) {
      const seed = dailyMode ? selectedDate : `random_${Date.now()}`;
      const savedState = loadGameState(dailyMode ? selectedDate : undefined);
      
      // Reset solution visibility when puzzle changes
      setShowSolution(false);
      
      if (savedState && savedState.dailyMode === dailyMode) {
        // Restore saved state
        const generated = generateSolvablePuzzle(seed);
        setPuzzleData(generated);
        setTarget(savedState.target);
        setSolution(savedState.solution || generated.solution);
        setNumbers(savedState.numbers);
        setHistory(savedState.history);
        setDistanceEmojis(savedState.distanceEmojis);
        setElapsedTime(savedState.elapsedTime);
        setGameEnded(savedState.gameEnded);
        setPreviousStates(savedState.previousStates || []); // Restore undo history
      } else {
        // Generate new puzzle
        const generated = generateSolvablePuzzle(seed);
        setPuzzleData(generated);
        setTarget(generated.target);
        setSolution(generated.solution);
        setNumbers(generated.numbers.map((value) => ({ value, used: false })));
        setHistory([]);
        setDistanceEmojis([]);
        setElapsedTime(0);
        setGameEnded(false);
      }
    }
  }, [dailyMode, selectedDate]);

  // Save state whenever it changes
  useEffect(() => {
    if (puzzleData && numbers.length > 0) {
      const dateKey = dailyMode ? selectedDate : "random";
      const savedState: SavedGameState = {
        numbers,
        history,
        distanceEmojis,
        elapsedTime,
        gameEnded,
        target,
        puzzleDate: dateKey,
        dailyMode,
        solution, // Save the solution
        previousStates, // Save undo history
      };
      // Use date-specific key: numberPuzzleState_YYYY-MM-DD for daily mode, numberPuzzleState_random for random
      const storageKey = dailyMode ? `numberPuzzleState_${selectedDate}` : "numberPuzzleState_random";
      localStorage.setItem(storageKey, JSON.stringify(savedState));
    }
  }, [numbers, history, distanceEmojis, elapsedTime, gameEnded, target, dailyMode, puzzleData, solution, selectedDate, previousStates]);

  // Timer effect
  useEffect(() => {
    if (!gameEnded) {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [gameEnded]);

  // Check for game end
  useEffect(() => {
    const available = numbers.filter(n => !n.used).map(n => n.value);
    if (available.length === 0) return;
    
    const closest = available.reduce((prev: number, curr: number) => 
      Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
    );
    const distance = Math.abs(closest - target);
    
    if (distance === 0 || (available.length === 1 && distance !== 0)) {
      setGameEnded(true);
    }
  }, [numbers, target]);

  const operations = [
    { symbol: "+", name: "add", color: "bg-green-500 hover:bg-green-600" },
    { symbol: "−", name: "subtract", color: "bg-blue-500 hover:bg-blue-600" },
    { symbol: "×", name: "multiply", color: "bg-purple-500 hover:bg-purple-600" },
    { symbol: "÷", name: "divide", color: "bg-red-500 hover:bg-red-600" },
  ];

  const selectOperation = (op: string) => {
    if (selectedOperation === op) {
      setSelectedOperation(null);
    } else {
      setSelectedOperation(op);
    }
  };

  const selectNumber = (index: number) => {
    // Don't allow selecting used numbers
    if (numbers[index].used) return;

    // If we have a number and operation selected, perform the operation
    if (selectedNumberIndex !== null && selectedOperation !== null && selectedNumberIndex !== index) {
      performOperation(selectedNumberIndex, index, selectedOperation);
      return;
    }

    // Otherwise, just select/deselect the number
    if (selectedNumberIndex === index) {
      setSelectedNumberIndex(null);
    } else {
      setSelectedNumberIndex(index);
    }
  };

  const getPreviewResult = (firstIndex: number, secondIndex: number, op: string): number | null => {
    if (numbers[secondIndex].used) return null;
    const a = numbers[firstIndex].value;
    const b = numbers[secondIndex].value;
    return calculateResult(a, b, op);
  };

  const performOperation = (idx1: number, idx2: number, op: string) => {
    const a = numbers[idx1].value;
    const b = numbers[idx2].value;
    const result = calculateResult(a, b, op);

    if (result === null) {
      alert("Invalid operation! Division must result in a whole number.");
      return;
    }

    // Mark the two numbers as used and add the result as a new number
    const newNumbers = numbers.map((n, index) => 
      index === idx1 || index === idx2 ? { ...n, used: true } : n
    );
    newNumbers.push({ value: result, used: false });
    
    // Calculate distance after this operation
    const availableAfter = newNumbers.filter(n => !n.used).map(n => n.value);
    const closestAfter = availableAfter.length > 0
      ? availableAfter.reduce((prev: number, curr: number) => 
          Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
        )
      : null;
    const distanceAfter = closestAfter !== null ? Math.abs(closestAfter - target) : null;
    const distanceEmoji = distanceAfter !== null ? getRatingEmoji(distanceAfter) : "😬";

    // Store previous state for undo
    setPreviousStates([...previousStates, {
      numbers: numbers.map(n => ({ ...n })),
      history: [...history],
      distanceEmojis: [...distanceEmojis],
    }]);

    // Create expression string
    let expr: string;
    switch (op) {
      case "+":
        expr = `${a} + ${b} = ${result}`;
        break;
      case "−":
        const max = Math.max(a, b);
        const min = Math.min(a, b);
        expr = `${max} - ${min} = ${result}`;
        break;
      case "×":
        expr = `${a} × ${b} = ${result}`;
        break;
      case "÷":
        const dividend = Math.max(a, b);
        const divisor = Math.min(a, b);
        expr = `${dividend} ÷ ${divisor} = ${result}`;
        break;
      default:
        expr = "";
    }
    
    setNumbers(newNumbers);
    setHistory([...history, expr]);
    setDistanceEmojis([...distanceEmojis, distanceEmoji]);
    setSelectedNumberIndex(null);
    setSelectedOperation(null);
  };

  const undo = () => {
    if (previousStates.length === 0) return;
    
    const previousState = previousStates[previousStates.length - 1];
    setNumbers(previousState.numbers.map(n => ({ ...n })));
    setHistory(previousState.history);
    setDistanceEmojis(previousState.distanceEmojis);
    setPreviousStates(previousStates.slice(0, -1));
    setSelectedNumberIndex(null);
    setSelectedOperation(null);
  };

  const reset = () => {
    // Clear saved state when resetting (only for non-daily mode, daily mode keeps state per date)
    if (!dailyMode) {
      localStorage.removeItem("numberPuzzleState_random");
    } else {
      // For daily mode, clear the saved state for this specific date
      localStorage.removeItem(`numberPuzzleState_${selectedDate}`);
    }
    
    setElapsedTime(0);
    setGameEnded(false);
    // Regenerate puzzle with same seed if daily mode, or new timestamp seed for random mode
    const seed = dailyMode ? selectedDate : `random_${Date.now()}`;
    const generated = generateSolvablePuzzle(seed);
    setPuzzleData(generated);
    setTarget(generated.target);
    setSolution(generated.solution);
    setNumbers(generated.numbers.map((value) => ({ value, used: false })));
    setHistory([]);
    setDistanceEmojis([]);
    setSelectedNumberIndex(null);
    setSelectedOperation(null);
    setPreviousStates([]);
  };

  const getAvailableNumbers = () => {
    return numbers.filter(n => !n.used).map(n => n.value);
  };

  const getDistance = () => {
    const available = getAvailableNumbers();
    if (available.length === 0) return null;
    const closest = available.reduce((prev: number, curr: number) => 
      Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
    );
    return Math.abs(closest - target);
  };

  const getClosestNumber = () => {
    const available = getAvailableNumbers();
    if (available.length === 0) return null;
    return available.reduce((prev: number, curr: number) => 
      Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
    );
  };

  const available = getAvailableNumbers();
  const closest = getClosestNumber();
  const distance = getDistance();
  const remainingCount = available.length;
  const hasWon = closest !== null && distance === 0;
  const hasLost = remainingCount === 1 && !hasWon;
  const ratingEmoji = distance !== null ? getRatingEmoji(distance) : "😬";
  
  // Check if current puzzle is today's puzzle (for sharing)
  const today = getDailyPuzzleDate();
  const isTodayPuzzle = dailyMode && selectedDate === today;

  const shareResult = async () => {
    // Only allow sharing today's puzzle (safety check)
    if (dailyMode) {
      const todayDate = getDailyPuzzleDate();
      if (selectedDate !== todayDate) {
        alert("You can only share today's puzzle!");
        return;
      }
    }

    const emojiRow = distanceEmojis.join("");
    // Only add final emoji if it's different from the last one (to avoid duplicate 💯)
    const lastEmoji = distanceEmojis.length > 0 ? distanceEmojis[distanceEmojis.length - 1] : null;
    const finalEmoji = hasWon 
      ? (lastEmoji === "💯" ? "" : ratingEmoji) 
      : "❌";
    const todayDate = getDailyPuzzleDate();
    const dateText = dailyMode ? `\nDate: ${formatDateForDisplay(todayDate)}` : "";
    const shareText = `${emojiRow}${finalEmoji}\n\nTime: ${formatTime(elapsedTime)}${dateText}`;
    
    try {
      await navigator.clipboard.writeText(shareText);
      alert("Result copied to clipboard!");
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        alert("Result copied to clipboard!");
      } catch (fallbackErr) {
        alert("Failed to copy. Here's your result:\n\n" + shareText);
      }
      document.body.removeChild(textArea);
    }
  };

  // Don't render until puzzle is initialized (prevents hydration mismatch)
  if (!puzzleData || numbers.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <p className="text-xl text-gray-600">Loading puzzle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 relative min-h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Number Puzzle</h1>
          {dailyMode && (
            <span className="px-2 sm:px-3 py-1 bg-yellow-500 text-yellow-900 rounded-full text-xs sm:text-sm font-semibold">
              📅 Daily
            </span>
          )}
        </div>
        <button
          onClick={() => setShowInstructions(true)}
          className="px-5 sm:px-4 py-3 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold text-base sm:text-base"
        >
          ❓ How to Play
        </button>
      </div>
      
      <div className={`p-4 sm:p-6 rounded-lg mb-6 sm:mb-8 text-center ${
        hasWon ? "bg-green-100 border-2 sm:border-4 border-green-500" :
        hasLost ? "bg-red-100 border-2 sm:border-4 border-red-500" :
        "bg-blue-100"
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-2">
          <div className="text-base sm:text-lg font-semibold text-gray-600">
            ⏱️ {formatTime(elapsedTime)}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">Target: {target}</h2>
          {hasWon && distance !== null && (
            <div className="text-xl sm:text-2xl">{ratingEmoji}</div>
          )}
        </div>
        {hasWon ? (
          <>
            <p className="text-xl sm:text-2xl font-bold text-green-700 mt-2">🎉 You Win! 🎉</p>
            {distance !== null && (
              <p className="text-base sm:text-lg text-green-600 mt-2">
                Rating: {ratingEmoji} (Distance: {distance})
              </p>
            )}
          </>
        ) : hasLost ? (
          <p className="text-xl sm:text-2xl font-bold text-red-700 mt-2">Game Over - You Lost!</p>
        ) : (
          <>
            <p className="text-sm sm:text-base text-gray-700">Use the numbers below to get as close as possible to the target</p>
            {closest !== null && distance !== null && (
              <p className="text-base sm:text-lg font-semibold mt-2">
                Closest: {closest} (Distance: {distance})
              </p>
            )}
          </>
        )}
      </div>

      {/* Operations at the top */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <span className="text-base sm:text-lg font-semibold text-gray-700">Operations:</span>
          <div className="flex flex-wrap gap-2 sm:gap-4 justify-center items-center">
            {operations.map((op) => {
              const isSelected = selectedOperation === op.symbol;
              return (
                <button
                  key={op.symbol}
                  onClick={() => selectOperation(op.symbol)}
                  disabled={hasWon || hasLost}
                  className={`px-6 sm:px-6 py-4 sm:py-3 text-white rounded-lg font-semibold text-xl sm:text-lg transition-colors ${
                    isSelected
                      ? `${op.color} ring-2 sm:ring-4 ring-opacity-50 ring-gray-400`
                      : `${op.color} opacity-80`
                  } ${hasWon || hasLost ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {op.symbol}
                </button>
              );
            })}
            <button
              onClick={undo}
              disabled={previousStates.length === 0 || hasWon || hasLost}
              className="px-6 sm:px-6 py-4 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-base sm:text-base"
            >
              Undo
            </button>
            {(hasWon || hasLost) && (
              <button
                onClick={() => setShowSolution(!showSolution)}
                className="px-6 sm:px-6 py-4 sm:py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold text-base sm:text-base"
              >
                {showSolution ? "Hide" : "Show"} Solution
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Numbers with preview results - all on one line */}
      <div className="flex flex-wrap gap-2 sm:gap-4 justify-center mb-6 sm:mb-8 items-start">
        {numbers.map((num, index) => {
          const isSelected = selectedNumberIndex === index;
          const isUsed = num.used;
          const showPreview = !isUsed && 
                             !hasWon &&
                             !hasLost &&
                             selectedNumberIndex !== null && 
                             selectedOperation !== null && 
                             selectedNumberIndex !== index &&
                             !numbers[selectedNumberIndex].used;
          const previewResult = showPreview 
            ? getPreviewResult(selectedNumberIndex, index, selectedOperation)
            : null;
          const canPerformOperation = previewResult !== null;

          return (
            <div key={index} className="relative flex flex-col items-center mb-6 sm:mb-7">
              <button
                onClick={() => selectNumber(index)}
                disabled={isUsed || hasWon || hasLost}
                className={`px-6 sm:px-6 py-5 sm:py-4 text-2xl sm:text-2xl font-bold rounded-lg transition-colors relative min-w-[80px] sm:min-w-[80px] ${
                  isUsed
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed line-through"
                    : isSelected
                    ? "bg-blue-500 text-white ring-2 sm:ring-4 ring-blue-300"
                    : canPerformOperation
                    ? "bg-gray-200 hover:bg-gray-300 border-2 border-green-400"
                    : "bg-gray-200 hover:bg-gray-300"
                } ${hasWon || hasLost ? "opacity-50" : ""}`}
              >
                {num.value}
              </button>
              {showPreview && previewResult !== null && (
                <div className="absolute top-full mt-1 sm:mt-1.5 text-xs sm:text-sm font-semibold text-green-600 whitespace-nowrap z-10">
                  = {previewResult}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status message */}
      {!hasWon && !hasLost && selectedNumberIndex !== null && selectedOperation !== null && !numbers[selectedNumberIndex].used && (
        <div className="text-center mb-4">
          <p className="text-base sm:text-lg text-gray-600">
            Selected: {numbers[selectedNumberIndex].value} {selectedOperation} ?
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Click another number to perform the operation
          </p>
        </div>
      )}

      {showSolution && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-4 sm:p-6 rounded-lg mb-4">
          <h3 className="font-bold text-lg sm:text-xl mb-4 text-yellow-900">Solution:</h3>
          <ol className="space-y-2">
            {solution.map((step, index) => {
              const opSymbol = step.op === "+" ? "+" : step.op === "−" ? "−" : step.op === "×" ? "×" : "÷";
              return (
                <li key={index} className="text-sm sm:text-lg font-mono bg-white p-2 sm:p-3 rounded border border-yellow-300">
                  <span className="font-bold text-yellow-700">Step {index + 1}:</span> {step.a} {opSymbol} {step.b} = <span className="font-bold text-green-600">{step.result}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-xs sm:text-sm text-yellow-700 italic">
            Follow these steps in order to reach the target of {target}.
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-gray-100 p-3 sm:p-4 rounded-lg mb-4">
          <h3 className="font-bold mb-2 text-sm sm:text-base">History:</h3>
          <ul className="space-y-1">
            {history.map((item: string, index: number) => (
              <li key={index} className="font-mono text-xs sm:text-sm">{item}</li>
            ))}
          </ul>
        </div>
      )}

      {(hasWon || hasLost) && (
        <div className="bg-purple-50 border-2 border-purple-400 p-4 sm:p-6 rounded-lg mb-4 text-center">
          <h3 className="font-bold text-lg sm:text-xl mb-4 text-purple-900">Your Result:</h3>
          <div className="text-2xl sm:text-4xl mb-4 break-all">
            {distanceEmojis.map((emoji, index) => (
              <span key={index}>{emoji}</span>
            ))}
            {/* Only show final emoji if it's different from the last one (to avoid duplicate 💯) */}
            {hasWon && distanceEmojis.length > 0 && distanceEmojis[distanceEmojis.length - 1] !== "💯" && (
              <span>{ratingEmoji}</span>
            )}
            {hasWon && distanceEmojis.length === 0 && <span>{ratingEmoji}</span>}
            {hasLost && <span>❌</span>}
          </div>
          <p className="text-base sm:text-lg text-purple-700 mb-4">Time: {formatTime(elapsedTime)}</p>
          {isTodayPuzzle && (
            <button
              onClick={shareResult}
              className="px-6 sm:px-6 py-4 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-base sm:text-base"
            >
              📋 Share Result
            </button>
          )}
        </div>
      )}

      {!dailyMode && (
        <div className="text-center">
          <button
            onClick={reset}
            className="px-6 sm:px-6 py-4 sm:py-3 rounded-lg font-semibold text-base sm:text-base bg-gray-900 text-white hover:bg-gray-800"
          >
            New Game
          </button>
        </div>
      )}

      {/* Instructions Popover */}
      {showInstructions && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
          onClick={() => setShowInstructions(false)}
        >
          <div className="bg-white rounded-lg p-4 sm:p-8 max-w-2xl max-h-[90vh] overflow-y-auto w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold">How to Play</h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Objective</h3>
                <p className="text-sm sm:text-base text-gray-700">
                  Use the six starting numbers (2 large numbers from 25, 50, 75, 100 and 4 small numbers from 1-10) 
                  to reach the target number. You can only use each number once!
                </p>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">How to Play</h3>
                <ol className="list-decimal list-inside space-y-1 sm:space-y-2 text-sm sm:text-base text-gray-700">
                  <li>Select an operation (+, −, ×, ÷) from the top</li>
                  <li>Click on a number to select it as the first operand</li>
                  <li>You'll see preview results below other numbers showing what the result would be</li>
                  <li>Click another number to perform the operation</li>
                  <li>The two numbers you used will be grayed out, and the result becomes a new number you can use</li>
                  <li>Continue until you reach the target or run out of moves</li>
                  <li>Use the Undo button to reverse your last move</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Rules</h3>
                <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-sm sm:text-base text-gray-700">
                  <li>Each number can only be used once</li>
                  <li>Division must result in a whole number</li>
                  <li>Subtraction always uses the larger number minus the smaller number</li>
                  <li>You win by reaching the exact target number</li>
                  <li>You lose if only one number remains and it's not the target</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Rating System</h3>
                <p className="text-sm sm:text-base text-gray-700 mb-2 sm:mb-3">
                  After each operation, you'll see an emoji showing how close you are to the target:
                </p>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-1 sm:space-y-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">💯</span>
                    <span className="text-xs sm:text-sm text-gray-700">Exact match (distance = 0)</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">👑</span>
                    <span className="text-xs sm:text-sm text-gray-700">Very close (distance 1-9)</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">🤩</span>
                    <span className="text-xs sm:text-sm text-gray-700">Close (distance 10-49)</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">🧐</span>
                    <span className="text-xs sm:text-sm text-gray-700">Getting there (distance 50-99)</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">😬</span>
                    <span className="text-xs sm:text-sm text-gray-700">Far away (distance 100+)</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Sharing Your Score</h3>
                <p className="text-sm sm:text-base text-gray-700">
                  When you win or lose, you can share your result! The emoji row shows your progress after each move, 
                  and the final emoji is your rating. Share with friends to compare scores!
                </p>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={() => setShowInstructions(false)}
                  className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold text-sm sm:text-base"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
