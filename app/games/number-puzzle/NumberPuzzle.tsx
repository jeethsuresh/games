"use client";

import { useState, useMemo, useEffect, useRef } from "react";

interface NumberWithState {
  value: number;
  used: boolean;
}

interface GameState {
  numbers: NumberWithState[];
  history: string[];
  distanceEmojis: string[];
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

function generateSolvablePuzzle(): { numbers: number[]; target: number; solution: SolutionStep[] } {
  const maxAttempts = 100;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const large = [25, 50, 75, 100];
    const small = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10) + 1);
    const selectedLarge = large.sort(() => Math.random() - 0.5).slice(0, 2);
    const numbers = [...selectedLarge, ...small];
    const target = Math.floor(Math.random() * 900) + 100;

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

export function NumberPuzzle() {
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

  // Initialize puzzle only on client side to avoid hydration mismatch
  useEffect(() => {
    if (!puzzleData) {
      const generated = generateSolvablePuzzle();
      setPuzzleData(generated);
      setTarget(generated.target);
      setSolution(generated.solution);
      setNumbers(generated.numbers.map((value) => ({ value, used: false })));
    }
  }, [puzzleData]);

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
    setElapsedTime(0);
    setGameEnded(false);
    window.location.reload();
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

  const shareResult = async () => {
    const emojiRow = distanceEmojis.join("");
    // Only add final emoji if it's different from the last one (to avoid duplicate 💯)
    const lastEmoji = distanceEmojis.length > 0 ? distanceEmojis[distanceEmojis.length - 1] : null;
    const finalEmoji = hasWon 
      ? (lastEmoji === "💯" ? "" : ratingEmoji) 
      : "❌";
    const shareText = `${emojiRow}${finalEmoji}\n\nTime: ${formatTime(elapsedTime)}`;
    
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
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Number Puzzle</h1>
        <button
          onClick={() => setShowInstructions(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
        >
          ❓ How to Play
        </button>
      </div>
      
      <div className={`p-6 rounded-lg mb-8 text-center ${
        hasWon ? "bg-green-100 border-4 border-green-500" :
        hasLost ? "bg-red-100 border-4 border-red-500" :
        "bg-blue-100"
      }`}>
        <div className="flex justify-between items-center mb-2">
          <div className="text-lg font-semibold text-gray-600">
            ⏱️ {formatTime(elapsedTime)}
          </div>
          <h2 className="text-2xl font-bold">Target: {target}</h2>
          {hasWon && distance !== null && (
            <div className="text-2xl">{ratingEmoji}</div>
          )}
        </div>
        {hasWon ? (
          <>
            <p className="text-2xl font-bold text-green-700 mt-2">🎉 You Win! 🎉</p>
            {distance !== null && (
              <p className="text-lg text-green-600 mt-2">
                Rating: {ratingEmoji} (Distance: {distance})
              </p>
            )}
          </>
        ) : hasLost ? (
          <p className="text-2xl font-bold text-red-700 mt-2">Game Over - You Lost!</p>
        ) : (
          <>
            <p className="text-gray-700">Use the numbers below to get as close as possible to the target</p>
            {closest !== null && distance !== null && (
              <p className="text-lg font-semibold mt-2">
                Closest: {closest} (Distance: {distance})
              </p>
            )}
          </>
        )}
      </div>

      {/* Operations at the top */}
      <div className="mb-8">
        <div className="flex gap-4 justify-center items-center">
          <span className="text-lg font-semibold text-gray-700 mr-2">Operations:</span>
          {operations.map((op) => {
            const isSelected = selectedOperation === op.symbol;
            return (
              <button
                key={op.symbol}
                onClick={() => selectOperation(op.symbol)}
                disabled={hasWon || hasLost}
                className={`px-6 py-3 text-white rounded-lg font-semibold text-lg transition-colors ${
                  isSelected
                    ? `${op.color} ring-4 ring-opacity-50 ring-gray-400`
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
            className="ml-4 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
          >
            Undo
          </button>
          {(hasWon || hasLost) && (
            <button
              onClick={() => setShowSolution(!showSolution)}
              className="ml-4 px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold text-lg"
            >
              {showSolution ? "Hide" : "Show"} Solution
            </button>
          )}
        </div>
      </div>

      {/* Numbers with preview results - all on one line */}
      <div className="flex flex-wrap gap-4 justify-center mb-8 items-end">
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
            <div key={index} className="relative flex flex-col items-center">
              <button
                onClick={() => selectNumber(index)}
                disabled={isUsed || hasWon || hasLost}
                className={`px-6 py-4 text-2xl font-bold rounded-lg transition-colors relative min-w-[80px] ${
                  isUsed
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed line-through"
                    : isSelected
                    ? "bg-blue-500 text-white ring-4 ring-blue-300"
                    : canPerformOperation
                    ? "bg-gray-200 hover:bg-gray-300 border-2 border-green-400"
                    : "bg-gray-200 hover:bg-gray-300"
                } ${hasWon || hasLost ? "opacity-50" : ""}`}
              >
                {num.value}
              </button>
              {showPreview && previewResult !== null && (
                <div className="absolute -bottom-6 text-sm font-semibold text-green-600 whitespace-nowrap">
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
          <p className="text-lg text-gray-600">
            Selected: {numbers[selectedNumberIndex].value} {selectedOperation} ?
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Click another number to perform the operation
          </p>
        </div>
      )}

      {showSolution && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-6 rounded-lg mb-4">
          <h3 className="font-bold text-xl mb-4 text-yellow-900">Solution:</h3>
          <ol className="space-y-2">
            {solution.map((step, index) => {
              const opSymbol = step.op === "+" ? "+" : step.op === "−" ? "−" : step.op === "×" ? "×" : "÷";
              return (
                <li key={index} className="text-lg font-mono bg-white p-3 rounded border border-yellow-300">
                  <span className="font-bold text-yellow-700">Step {index + 1}:</span> {step.a} {opSymbol} {step.b} = <span className="font-bold text-green-600">{step.result}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-sm text-yellow-700 italic">
            Follow these steps in order to reach the target of {target}.
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <h3 className="font-bold mb-2">History:</h3>
          <ul className="space-y-1">
            {history.map((item: string, index: number) => (
              <li key={index} className="font-mono">{item}</li>
            ))}
          </ul>
        </div>
      )}

      {(hasWon || hasLost) && (
        <div className="bg-purple-50 border-2 border-purple-400 p-6 rounded-lg mb-4 text-center">
          <h3 className="font-bold text-xl mb-4 text-purple-900">Your Result:</h3>
          <div className="text-4xl mb-4">
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
          <p className="text-lg text-purple-700 mb-4">Time: {formatTime(elapsedTime)}</p>
          <button
            onClick={shareResult}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-lg"
          >
            📋 Share Result
          </button>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={reset}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold"
        >
          New Game
        </button>
      </div>

      {/* Instructions Popover */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowInstructions(false)}>
          <div className="bg-white rounded-lg p-8 max-w-2xl max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">How to Play</h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-3">Objective</h3>
                <p className="text-gray-700">
                  Use the six starting numbers (2 large numbers from 25, 50, 75, 100 and 4 small numbers from 1-10) 
                  to reach the target number. You can only use each number once!
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3">How to Play</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
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
                <h3 className="text-xl font-bold mb-3">Rules</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Each number can only be used once</li>
                  <li>Division must result in a whole number</li>
                  <li>Subtraction always uses the larger number minus the smaller number</li>
                  <li>You win by reaching the exact target number</li>
                  <li>You lose if only one number remains and it's not the target</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3">Rating System</h3>
                <p className="text-gray-700 mb-3">
                  After each operation, you'll see an emoji showing how close you are to the target:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💯</span>
                    <span className="text-gray-700">Exact match (distance = 0)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👑</span>
                    <span className="text-gray-700">Very close (distance 1-9)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🤩</span>
                    <span className="text-gray-700">Close (distance 10-49)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧐</span>
                    <span className="text-gray-700">Getting there (distance 50-99)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">😬</span>
                    <span className="text-gray-700">Far away (distance 100+)</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3">Sharing Your Score</h3>
                <p className="text-gray-700">
                  When you win or lose, you can share your result! The emoji row shows your progress after each move, 
                  and the final emoji is your rating. Share with friends to compare scores!
                </p>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={() => setShowInstructions(false)}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
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
