"use client";

import { useState, useMemo, useEffect } from "react";
import { getDailyPuzzleDate, SeededRandom } from "@/utils/dailyPuzzle";
import { loadAllWords, loadTargetWords } from "./wordLoader";

// Letter frequency in English (most common to least common)
// We'll map these to wheel segments from highest value (200) to lowest (40)
const LETTER_FREQUENCY = [
  "E", "T", "A", "O", "I", "N", "S", "H", "R", // Most common (200-120)
  "D", "L", "U", "C", "M", "W", "F", "G", "Y", // Medium (100-60)
  "P", "B", "V", "K", "J", "X", "Q", "Z"       // Least common (40)
];

// Wheel segments: $40 to $200 in $20 increments
const WHEEL_SEGMENTS = [200, 180, 160, 140, 120, 100, 80, 60, 40];

interface WheelSegment {
  value: number;
  letter: string;
}

type GamePhase = "spinning" | "guessing" | "finished";
type GameResult = "success" | "failure" | null;

export function WheelOfFortune() {
  // Initialize game data only on client to avoid hydration mismatch
  const [targetWord, setTargetWord] = useState<string>("");
  const [wheelSegments, setWheelSegments] = useState<WheelSegment[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [validWords, setValidWords] = useState<Set<string>>(new Set());

  // Track used letters to ensure uniqueness
  const [usedLetters, setUsedLetters] = useState<Set<string>>(new Set());

  // Initialize game data on client side only
  useEffect(() => {
    const initializeGame = async () => {
      // Load words in parallel
      const [allWords, targetWords] = await Promise.all([
        loadAllWords(),
        loadTargetWords()
      ]);

      if (targetWords.length === 0) {
        console.error('No target words loaded');
        return;
      }

      setValidWords(allWords);

      const puzzleDate = getDailyPuzzleDate();
      const rng = new SeededRandom(`wheel-${puzzleDate}`);
      
      // Get daily target word from words_final.txt (5-9 letters)
      const wordIndex = rng.nextInt(0, targetWords.length);
      const word = targetWords[wordIndex];
    
    // Create wheel segments with unique letters mapped by frequency
    const segments: WheelSegment[] = [];
    const used = new Set<string>();
    
    // Assign unique letters to segments, maintaining frequency mapping
    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
      const value = WHEEL_SEGMENTS[i];
      const letterIndex = Math.floor((i / WHEEL_SEGMENTS.length) * LETTER_FREQUENCY.length);
      
      // Find the first available letter from the frequency list that hasn't been used
      let letter = LETTER_FREQUENCY[letterIndex];
      let offset = 0;
      while (used.has(letter) && offset < LETTER_FREQUENCY.length) {
        offset++;
        const nextIndex = (letterIndex + offset) % LETTER_FREQUENCY.length;
        letter = LETTER_FREQUENCY[nextIndex];
      }
      
      used.add(letter);
      segments.push({ value, letter });
    }
    
    // Then shuffle the segments deterministically
    for (let i = segments.length - 1; i > 0; i--) {
      const j = rng.nextInt(0, i + 1);
      [segments[i], segments[j]] = [segments[j], segments[i]];
    }
    
      setTargetWord(word);
      setWheelSegments(segments);
      setUsedLetters(new Set());
      setIsInitialized(true);
    };

    initializeGame();
  }, []);

  // Calculate spins based on word length (word length + 2)
  const initialSpins = targetWord.length > 0 ? targetWord.length + 2 : 0;

  const [phase, setPhase] = useState<GamePhase>("spinning");
  const [spinsRemaining, setSpinsRemaining] = useState(initialSpins);
  const [money, setMoney] = useState(0);
  // Track revealed positions: array where each index corresponds to a position in the word
  const [revealedPositions, setRevealedPositions] = useState<(string | null)[]>([]);
  // Track all revealed letters (for display purposes)
  const [revealedLetters, setRevealedLetters] = useState<Set<string>>(new Set());
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<number | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameResult, setGameResult] = useState<GameResult>(null);

  // Initialize revealed positions and spins when word is set
  useEffect(() => {
    if (targetWord.length > 0) {
      setRevealedPositions(Array(targetWord.length).fill(null));
      setRevealedLetters(new Set());
      setSpinsRemaining(targetWord.length + 2);
    }
  }, [targetWord]);

  // Wheel rotation state
  const [rotation, setRotation] = useState(0);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);

  const handleSpin = () => {
    if (isSpinning || spinsRemaining === 0 || !isInitialized) return;
    
    setIsSpinning(true);
    setSelectedSegmentIndex(null);
    
    // Create a new RNG for this spin (deterministic based on puzzle date and spin number)
    const puzzleDate = getDailyPuzzleDate();
    const totalSpins = targetWord.length + 2;
    const spinRng = new SeededRandom(`wheel-${puzzleDate}-spin-${totalSpins - spinsRemaining}`);
    
    // Get available segments (those with letters not yet used)
    const availableSegments = wheelSegments
      .map((segment, index) => ({ segment, index }))
      .filter(({ segment }) => !usedLetters.has(segment.letter));
    
    // If all letters are used, allow any segment (shouldn't happen, but safety check)
    const segmentsToChooseFrom = availableSegments.length > 0 ? availableSegments : wheelSegments.map((segment, index) => ({ segment, index }));
    
    // Random spin: 3-5 full rotations plus random segment
    const fullRotations = 3 + spinRng.nextInt(0, 3); // 3-5 rotations
    const chosen = segmentsToChooseFrom[spinRng.nextInt(0, segmentsToChooseFrom.length)];
    const segmentIndex = chosen.index;
    const segmentAngle = 360 / wheelSegments.length;
    
    // Calculate exact rotation to align segment center with pointer (top = 0 degrees)
    // The pointer is at the top (0 degrees in screen coordinates)
    // When wheel rotation is 0, segment i's text is positioned at: i * segmentAngle + segmentAngle/2 degrees clockwise from top
    // When the wheel rotates clockwise by r degrees, segment i's text moves to: r + (i * segmentAngle + segmentAngle/2) degrees
    // To align segment i's text with pointer (0°), we need:
    //   r + (i * segmentAngle + segmentAngle/2) ≡ 0 (mod 360)
    // So: r ≡ -(i * segmentAngle + segmentAngle/2) (mod 360)
    // For positive clockwise rotation with full spins: r = fullRotations * 360 - (i * segmentAngle + segmentAngle/2)
    const segmentCenterAngle = segmentIndex * segmentAngle + segmentAngle / 2;
    
    // Calculate absolute final rotation (CSS transforms are absolute)
    // This will align the chosen segment's center with the pointer
    // When rotation=0, segment i's center is at: i * segmentAngle + segmentAngle/2
    // When we rotate by r, segment i's center is at: r + (i * segmentAngle + segmentAngle/2)
    // To align with pointer (0°): r + (i * segmentAngle + segmentAngle/2) ≡ 0 (mod 360)
    // So: r ≡ -(i * segmentAngle + segmentAngle/2) (mod 360)
    // For positive rotation: r = fullRotations * 360 - segmentCenterAngle
    const finalRotation = fullRotations * 360 - segmentCenterAngle;
    
    setRotation(finalRotation);
    
    // Use requestAnimationFrame to detect when animation completes
    // The animation duration is 4000ms with cubic-bezier easing
    const animationDuration = 4000;
    const startTime = Date.now();
    
    const checkAnimationComplete = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= animationDuration) {
        // Animation complete - ensure exact alignment
        setRotation(finalRotation);
        setIsSpinning(false);
        
        // Calculate which segment is actually at the pointer based on the final rotation
        // This ensures the visual and logical selection always match
        const actualSegment = getSegmentAtPointer(finalRotation);
        // Validate the segment index is within bounds
        if (actualSegment >= 0 && actualSegment < wheelSegments.length) {
          setSelectedSegmentIndex(actualSegment);
          setCurrentSegment(actualSegment);
        } else {
          // Fallback to the originally chosen segment if calculation is out of bounds
          if (segmentIndex >= 0 && segmentIndex < wheelSegments.length) {
            setSelectedSegmentIndex(segmentIndex);
            setCurrentSegment(segmentIndex);
          }
        }
      } else {
        requestAnimationFrame(checkAnimationComplete);
      }
    };
    
    requestAnimationFrame(checkAnimationComplete);
  };

  // Function to replace a used letter on the wheel with a new unique letter
  const replaceLetterOnWheel = (segmentIndex: number) => {
    const newSegments = [...wheelSegments];
    const currentUsed = new Set(usedLetters);
    const allWheelLetters = new Set(newSegments.map(s => s.letter));
    
    // Find a new unique letter that's not already on the wheel
    let newLetter: string | null = null;
    for (const letter of LETTER_FREQUENCY) {
      if (!allWheelLetters.has(letter) && !currentUsed.has(letter)) {
        newLetter = letter;
        break;
      }
    }
    
    // If we couldn't find one from frequency list, try all letters A-Z
    if (!newLetter) {
      for (let i = 0; i < 26; i++) {
        const letter = String.fromCharCode(65 + i); // A-Z
        if (!allWheelLetters.has(letter) && !currentUsed.has(letter)) {
          newLetter = letter;
          break;
        }
      }
    }
    
    // Replace the letter on the wheel
    if (newLetter) {
      newSegments[segmentIndex] = {
        ...newSegments[segmentIndex],
        letter: newLetter
      };
      setWheelSegments(newSegments);
    }
  };

  const handleTakeMoney = () => {
    if (selectedSegmentIndex === null) return;
    if (selectedSegmentIndex < 0 || selectedSegmentIndex >= wheelSegments.length) return;
    const segment = wheelSegments[selectedSegmentIndex];
    setMoney(money + segment.value);
    
    // Mark letter as used and replace it on the wheel
    const newUsed = new Set(usedLetters);
    newUsed.add(segment.letter);
    setUsedLetters(newUsed);
    replaceLetterOnWheel(selectedSegmentIndex);
    
    setSelectedSegmentIndex(null);
    setCurrentSegment(null);
    setSpinsRemaining(spinsRemaining - 1);
    
    if (spinsRemaining === 1) {
      setTimeout(() => setPhase("guessing"), 500);
    }
  };

  const handleRevealLetter = () => {
    if (selectedSegmentIndex === null) return;
    if (selectedSegmentIndex < 0 || selectedSegmentIndex >= wheelSegments.length) return;
    const segment = wheelSegments[selectedSegmentIndex];
    const letter = segment.letter;
    
    // Reveal the letter in all positions where it appears in the word
    const newRevealed = [...revealedPositions];
    for (let i = 0; i < targetWord.length; i++) {
      if (targetWord[i] === letter) {
        newRevealed[i] = letter;
      }
    }
    setRevealedPositions(newRevealed);
    
    // Add to revealed letters set (for display)
    const newRevealedLetters = new Set(revealedLetters);
    newRevealedLetters.add(letter);
    setRevealedLetters(newRevealedLetters);
    
    // Mark letter as used and replace it on the wheel
    const newUsed = new Set(usedLetters);
    newUsed.add(letter);
    setUsedLetters(newUsed);
    replaceLetterOnWheel(selectedSegmentIndex);
    
    setSelectedSegmentIndex(null);
    setCurrentSegment(null);
    setSpinsRemaining(spinsRemaining - 1);
    
    if (spinsRemaining === 1) {
      setTimeout(() => setPhase("guessing"), 500);
    }
  };

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    const guess = currentGuess.toUpperCase().trim();
    
    if (guess.length !== targetWord.length) {
      alert(`Please enter a ${targetWord.length}-letter word!`);
      return;
    }
    
    // Validate the guess is in the word list (words.txt)
    if (!/^[A-Z]+$/.test(guess)) {
      alert("Please enter only letters!");
      return;
    }
    
    if (!validWords.has(guess)) {
      alert("Not a valid word! Try another.");
      return;
    }
    
    if (guesses.includes(guess)) {
      alert("You've already tried this word!");
      return;
    }
    
    if (money < 25) {
      alert("You need $25 to make a guess!");
      return;
    }
    
    setMoney(money - 25);
    setGuesses([...guesses, guess]);
    setCurrentGuess("");
    
    if (guess === targetWord) {
      setGameResult("success");
      setPhase("finished");
    } else if (guesses.length >= maxGuesses - 1) {
      // Game over when we've used all guesses (guesses.length is 0-indexed, so maxGuesses - 1)
      setGameResult("failure");
      setPhase("finished");
    }
  };

  // Calculate letter colors for a guess using proper Wordle logic
  const getLetterColors = (guess: string): string[] => {
    const colors: string[] = new Array(guess.length).fill("bg-gray-500");
    const targetLetters = targetWord.split("");
    const guessLetters = guess.split("");
    
    // First pass: mark all correct positions (green)
    const usedTargetIndices = new Set<number>();
    
    for (let i = 0; i < guessLetters.length; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        colors[i] = "bg-green-500";
        usedTargetIndices.add(i);
      }
    }
    
    // Second pass: mark yellow for letters in wrong position
    // Count available letters in target (not used for green)
    const availableTargetLetters = new Map<string, number>();
    for (let i = 0; i < targetLetters.length; i++) {
      if (!usedTargetIndices.has(i)) {
        const letter = targetLetters[i];
        availableTargetLetters.set(letter, (availableTargetLetters.get(letter) || 0) + 1);
      }
    }
    
    // For each non-green position in guess, try to assign yellow
    for (let i = 0; i < guessLetters.length; i++) {
      if (colors[i] === "bg-green-500") continue; // Skip green positions
      
      const letter = guessLetters[i];
      const available = availableTargetLetters.get(letter) || 0;
      
      if (available > 0) {
        colors[i] = "bg-yellow-500";
        availableTargetLetters.set(letter, available - 1);
      } else {
        colors[i] = "bg-gray-500";
      }
    }
    
    return colors;
  };

  const getLetterColor = (letter: string, position: number, guess: string) => {
    const colors = getLetterColors(guess);
    return colors[position];
  };

  // Track letter states for keyboard (green = correct position, yellow = wrong position, gray = not in word, default = unused)
  const getLetterState = (letter: string): "correct" | "present" | "absent" | "unused" => {
    // Check all guesses to find the best state for this letter
    let bestState: "correct" | "present" | "absent" | "unused" = "unused";
    
    for (const guess of guesses) {
      for (let i = 0; i < guess.length; i++) {
        if (guess[i] === letter) {
          const colors = getLetterColors(guess);
          if (colors[i] === "bg-green-500") {
            bestState = "correct";
            break; // Green is best, no need to check further
          } else if (colors[i] === "bg-yellow-500") {
            if (bestState === "unused" || bestState === "absent") {
              bestState = "present";
            }
          } else if (colors[i] === "bg-gray-500" && bestState === "unused") {
            bestState = "absent";
          }
        }
      }
      if (bestState === "correct") break; // Already found best state
    }
    
    return bestState;
  };

  // Handle keyboard letter click
  const handleKeyboardLetter = (letter: string) => {
    if (currentGuess.length < targetWord.length && money >= 25) {
      setCurrentGuess(currentGuess + letter);
    }
  };

  // Handle backspace
  const handleBackspace = () => {
    setCurrentGuess(currentGuess.slice(0, -1));
  };

  // QWERTY keyboard layout
  const keyboardRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"]
  ];

  // Calculate wheel segment positions
  const segmentAngle = wheelSegments.length > 0 ? 360 / wheelSegments.length : 0;

  // Calculate max guesses based on word length
  // Formula: 1 + word.length + (2 if word.length > 6)
  const maxGuesses = useMemo(() => {
    if (targetWord.length === 0) return 6;
    return 1 + targetWord.length + (targetWord.length > 6 ? 2 : 0);
  }, [targetWord.length]);

  // Function to calculate which segment is at the pointer for a given rotation
  const getSegmentAtPointer = (rot: number): number => {
    if (wheelSegments.length === 0) return 0;
    // The pointer is at 0° (top)
    // When wheel is at rotation rot, segment i's center is at: rot + (i * segmentAngle + segmentAngle/2) in screen coordinates
    // We want to find i such that: rot + (i * segmentAngle + segmentAngle/2) ≡ 0 (mod 360)
    // So: i * segmentAngle + segmentAngle/2 ≡ -rot (mod 360)
    // Normalize rotation to 0-360 range
    const normalizedRot = ((rot % 360) + 360) % 360;
    // We need: i * segmentAngle + segmentAngle/2 ≡ -normalizedRot (mod 360)
    // So: i * segmentAngle + segmentAngle/2 ≡ 360 - normalizedRot (mod 360)
    const targetCenterAngle = (360 - normalizedRot) % 360;
    // Now solve for i: i * segmentAngle + segmentAngle/2 = targetCenterAngle
    // So: i * segmentAngle = targetCenterAngle - segmentAngle/2
    // So: i = (targetCenterAngle - segmentAngle/2) / segmentAngle
    let targetAngle = (targetCenterAngle - segmentAngle / 2 + 360) % 360;
    // Calculate the segment index directly using floor
    let segmentIndex = Math.floor(targetAngle / segmentAngle) % wheelSegments.length;
    // Ensure it's positive
    if (segmentIndex < 0) segmentIndex += wheelSegments.length;
    // Adjust by -2 to account for the offset (we're consistently two segments off)
    segmentIndex = segmentIndex - 2;
    // Normalize to ensure it's within bounds [0, wheelSegments.length)
    segmentIndex = ((segmentIndex % wheelSegments.length) + wheelSegments.length) % wheelSegments.length;
    return segmentIndex;
  };

  // Show loading state until initialized
  if (!isInitialized || targetWord.length === 0 || wheelSegments.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Wheel of Fortune</h1>
        <div className="text-center py-8">
          <p className="text-lg text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center">Wheel of Fortune</h1>
      
      <div className="mb-4 sm:mb-6 text-center">
        <div className="text-lg sm:text-xl mb-2">
          <span className="font-semibold">Money: </span>
          <span className="text-green-600">${money}</span>
        </div>
        {phase === "spinning" && (
          <div className="text-base sm:text-lg">
            <span className="font-semibold">Spins Remaining: </span>
            <span>{spinsRemaining}</span>
          </div>
        )}
      </div>

      {phase === "spinning" && (
        <div className="mb-6 sm:mb-8">
          {/* Wheel */}
          <div className="relative mx-auto mb-6 sm:mb-8 w-full max-w-[500px] aspect-square">
            <div
              className="absolute inset-0 rounded-full border-4 sm:border-8 border-gray-800 shadow-2xl"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning 
                  ? `transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)` 
                  : 'none',
                background: `conic-gradient(
                  ${wheelSegments.map((_, i) => {
                    const hue = (i * 360) / wheelSegments.length;
                    return `${i % 2 === 0 ? `hsl(${hue}, 70%, 50%)` : `hsl(${hue}, 70%, 60%)`} ${(i / wheelSegments.length) * 100}% ${((i + 1) / wheelSegments.length) * 100}%`;
                  }).join(", ")}
                )`,
              }}
            >
              {wheelSegments.map((segment, index) => {
                const angle = index * segmentAngle;
                const textAngle = angle + segmentAngle / 2;
                return (
                  <div
                    key={index}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      transform: `rotate(${textAngle}deg)`,
                      transformOrigin: "0 0",
                    }}
                  >
                    <div
                      className="text-white font-bold text-center"
                      style={{
                        transform: "translate(calc(min(30vw, 180px)), -50%)",
                        textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                      }}
                    >
                      <div className="text-xs sm:text-lg">${segment.value}</div>
                      <div className="text-lg sm:text-2xl font-extrabold">{segment.letter}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pointer */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 sm:-translate-y-2 z-10"
              style={{
                width: 0,
                height: 0,
                borderLeft: "clamp(12px, 3vw, 20px) solid transparent",
                borderRight: "clamp(12px, 3vw, 20px) solid transparent",
                borderTop: "clamp(24px, 6vw, 40px) solid #1f2937",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              }}
            />
            
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-20 sm:h-20 bg-gray-800 rounded-full border-2 sm:border-4 border-gray-600 z-10 flex items-center justify-center">
              <div className="text-white font-bold text-xs sm:text-sm">SPIN</div>
            </div>
          </div>

          {/* Spin button */}
          {!isSpinning && selectedSegmentIndex === null && (
            <div className="text-center mb-4 sm:mb-6">
              <button
                onClick={handleSpin}
                disabled={spinsRemaining === 0}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 active:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg sm:text-xl font-bold touch-manipulation min-h-[44px]"
              >
                Spin the Wheel
              </button>
            </div>
          )}

          {/* Choice buttons after spin */}
          {selectedSegmentIndex !== null && !isSpinning && selectedSegmentIndex >= 0 && selectedSegmentIndex < wheelSegments.length && (
            <div className="text-center mb-4 sm:mb-6">
              <div className="mb-3 sm:mb-4 text-base sm:text-lg">
                <p className="font-semibold">You landed on:</p>
                <p className="text-xl sm:text-2xl">
                  ${wheelSegments[selectedSegmentIndex].value} - Letter: {wheelSegments[selectedSegmentIndex].letter}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-4">
                <button
                  onClick={handleTakeMoney}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 font-semibold touch-manipulation min-h-[44px] text-base sm:text-lg"
                >
                  Take ${wheelSegments[selectedSegmentIndex].value}
                </button>
                <button
                  onClick={handleRevealLetter}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 font-semibold touch-manipulation min-h-[44px] text-base sm:text-lg"
                >
                  Reveal if "{wheelSegments[selectedSegmentIndex].letter}" is in word
                </button>
              </div>
            </div>
          )}

          {/* Revealed letters display */}
          {revealedLetters.size > 0 && (
            <div className="mt-4 sm:mt-6 mb-4 sm:mb-6">
              <p className="text-center font-semibold mb-2 text-sm sm:text-base">Revealed Letters:</p>
              <div className="flex flex-wrap gap-2 justify-center px-2">
                {Array.from(revealedLetters).sort().map((letter) => {
                  const isInWord = targetWord.includes(letter);
                  return (
                    <div
                      key={letter}
                      className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-bold rounded border-2 ${
                        isInWord
                          ? "bg-green-500 text-white border-green-600"
                          : "bg-gray-300 text-gray-700 border-gray-400"
                      }`}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Word display with blank boxes */}
          <div className="mt-4 sm:mt-6 mb-4 sm:mb-6">
            <p className="text-center font-semibold mb-3 sm:mb-4 text-base sm:text-lg">The Word:</p>
            <div className="flex gap-2 sm:gap-3 justify-center flex-wrap px-2">
              {revealedPositions.map((letter, index) => (
                <div
                  key={index}
                  className={`w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-2xl sm:text-3xl font-bold rounded border-2 sm:border-4 ${
                    letter
                      ? "bg-green-500 text-white border-green-600"
                      : "bg-gray-200 border-gray-400"
                  }`}
                >
                  {letter || " "}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === "guessing" && (
        <div>
          <div className="mb-6">
            <p className="text-center text-lg mb-4">
              Each guess costs <span className="font-bold text-red-600">$25</span>
            </p>
            {/* Word display with revealed letters */}
            <div className="mb-4 sm:mb-6">
              <p className="text-center font-semibold mb-3 sm:mb-4 text-base sm:text-lg">The Word:</p>
              <div className="flex gap-2 sm:gap-3 justify-center flex-wrap px-2">
                {revealedPositions.map((letter, index) => (
                  <div
                    key={index}
                    className={`w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-2xl sm:text-3xl font-bold rounded border-2 sm:border-4 ${
                      letter
                        ? "bg-green-500 text-white border-green-600"
                        : "bg-gray-200 border-gray-400"
                    }`}
                  >
                    {letter || " "}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Guess grid */}
          <div className="space-y-1 sm:space-y-2 mb-4 sm:mb-6">
            {Array.from({ length: maxGuesses }).map((_, rowIndex) => {
              const guess = guesses[rowIndex] || "";
              return (
                <div key={rowIndex} className="flex gap-1 sm:gap-2 justify-center px-2">
                  {Array.from({ length: targetWord.length }).map((_, colIndex) => {
                    const letter = guess[colIndex] || "";
                    const color = guess
                      ? getLetterColor(letter, colIndex, guess)
                      : "bg-gray-200";
                    return (
                      <div
                        key={colIndex}
                        className={`w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center text-lg sm:text-2xl font-bold text-white rounded ${color}`}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleGuess} className="text-center px-2 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-center mb-2">
              <input
                type="text"
                value={currentGuess}
                onChange={(e) => setCurrentGuess(e.target.value.toUpperCase().slice(0, targetWord.length))}
                className="px-4 py-3 sm:py-2 text-xl sm:text-2xl text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 uppercase w-full sm:w-48 min-h-[44px]"
                maxLength={targetWord.length}
                autoFocus
                disabled={money < 25}
                placeholder="Enter word"
              />
              <button
                type="submit"
                disabled={currentGuess.length !== targetWord.length || money < 25}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 active:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed touch-manipulation min-h-[44px] text-base sm:text-lg font-semibold"
              >
                Guess (-$25)
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">
              {currentGuess.length}/{targetWord.length} letters
            </p>
          </form>

          {/* QWERTY Keyboard */}
          <div className="px-2 mb-4 sm:mb-6">
            <div className="flex flex-col gap-1.5 sm:gap-2 max-w-2xl mx-auto">
              {keyboardRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1 sm:gap-1.5 justify-center">
                  {row.map((letter) => {
                    const state = getLetterState(letter);
                    const isDisabled = money < 25 || currentGuess.length >= targetWord.length;
                    let bgColor = "bg-gray-200";
                    let textColor = "text-gray-900";
                    
                    if (state === "correct") {
                      bgColor = "bg-green-500";
                      textColor = "text-white";
                    } else if (state === "present") {
                      bgColor = "bg-yellow-500";
                      textColor = "text-white";
                    } else if (state === "absent") {
                      bgColor = "bg-gray-500";
                      textColor = "text-white";
                    }
                    
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => handleKeyboardLetter(letter)}
                        disabled={isDisabled}
                        className={`${bgColor} ${textColor} px-2 sm:px-3 py-2 sm:py-3 rounded text-sm sm:text-base font-semibold hover:opacity-80 active:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[36px] sm:min-h-[44px] min-w-[28px] sm:min-w-[36px]`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              ))}
              {/* Backspace button */}
              <div className="flex justify-center mt-1">
                <button
                  type="button"
                  onClick={handleBackspace}
                  disabled={currentGuess.length === 0 || money < 25}
                  className="bg-gray-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded text-sm sm:text-base font-semibold hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[36px] sm:min-h-[44px]"
                >
                  ⌫ Backspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "finished" && (
        <div className="text-center px-2">
          <div className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
            {gameResult === "success" ? (
              <span className="text-green-600">Congratulations! You won!</span>
            ) : (
              <span className="text-red-600">Game Over!</span>
            )}
          </div>
          {gameResult === "failure" && (
            <p className="text-lg sm:text-xl mb-3 sm:mb-4">The word was: <span className="font-bold">{targetWord}</span></p>
          )}
          <p className="text-base sm:text-lg mb-4">Final Money: <span className="font-semibold text-green-600">${money}</span></p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 active:bg-gray-700 touch-manipulation min-h-[44px] text-base sm:text-lg font-semibold"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

