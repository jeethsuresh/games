"use client";

import { useState, useMemo, useEffect } from "react";
import { getDailyPuzzleDate, SeededRandom } from "@/utils/dailyPuzzle";

// Words of various lengths (5-9 letters) for the game
const WORDS: string[] = [
  // 5-letter words
  "APPLE", "BEACH", "CHAIR", "DANCE", "EARTH", "FLAME", "GLASS", "HEART",
  "IMAGE", "JAZZY", "KNIFE", "LEMON", "MUSIC", "NIGHT", "OCEAN", "PEACE",
  "QUICK", "RIVER", "SMILE", "TIGER", "UNITY", "VALUE", "WATER", "XENON",
  "YOUTH", "ZEBRA", "BRAVE", "CLOUD", "DREAM", "EAGLE", "FOCUS", "GHOST",
  "HAPPY", "IVORY", "JOKER", "KNEEL", "LIGHT", "MAGIC", "NOISE", "OLIVE",
  "PILOT", "QUART", "ROBOT", "STORM", "TRAIN", "URBAN", "VOCAL", "WHEEL",
  // 6-letter words
  "BANANA", "BRIDGE", "CIRCLE", "DANCER", "EAGLES", "FAMILY", "GARDEN", "HAPPEN",
  "ISLAND", "JUNGLE", "KITTEN", "LETTER", "MAGNET", "NATURE", "ORANGE", "PENCIL",
  "QUARTZ", "RABBIT", "SILVER", "TICKET", "VICTOR", "WINDOW", "YELLOW", "ZOMBIE",
  "BOTTLE", "CAMERA", "DINNER", "EFFORT", "FINGER", "GALAXY", "HAMMER", "INSECT",
  "JACKET", "KITCHEN", "LADDER", "MOMENT", "NEPHEW", "OFFICE", "POCKET", "RADIO",
  // 7-letter words
  "ANIMALS", "BALANCE", "CABINET", "DANCING", "FACTORY", "GALLERY", "HAPPILY", "IMAGINE",
  "JOURNEY", "KITTENS", "LIBRARY", "MACHINE", "NATURAL", "OUTDOOR", "PACKAGE", "QUALITY",
  "RAINBOW", "SCIENCE", "TRAVELS", "VICTORY", "WELCOME", "YELLOWS", "ZOMBIES", "BATTERY",
  "CANDLES", "DINNERS", "EFFORTS", "FINGERS", "GALAXIES", "HAMMERS", "JACKETS", "KITCHENS",
  // 8-letter words
  "ANIMATED", "BALANCED", "CABINETS", "FACTORIES", "GALLERIES", "HAPPINESS", "IMAGINED", "JOURNEYS",
  "LIBRARIES", "MACHINES", "NATURALLY", "OUTDOORS", "PACKAGES", "QUALITIES", "RAINBOWS", "SCIENCES",
  "TRAVELED", "VICTORIES", "WELCOMED", "BATTERIES", "CANDLESTICK", "DINNERTIME", "ELEPHANT", "UNIVERSE",
  // 9-letter words
  "ANIMATION", "BALANCING", "CABINETRY", "DANCINGLY", "FACTORING", "HAPPINESS", "IMAGINING", "JOURNEYED",
  "LIBRARIAN", "MACHINERY", "NATURALLY", "PACKAGING", "QUALIFIED", "RAINBOWED", "SCIENTIST", "TRAVELING",
  "VICTORIOUS", "WELCOMING", "BATTERING", "ELEPHANTS", "UNIVERSAL", "CANDLESTICKS", "DINNERTIMES"
];

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

  // Track used letters to ensure uniqueness
  const [usedLetters, setUsedLetters] = useState<Set<string>>(new Set());

  // Initialize game data on client side only
  useEffect(() => {
    const puzzleDate = getDailyPuzzleDate();
    const rng = new SeededRandom(`wheel-${puzzleDate}`);
    
    // Get daily target word (5-9 letters)
    const validWords = WORDS.filter(word => word.length >= 5 && word.length <= 9);
    const wordIndex = rng.nextInt(0, validWords.length);
    const word = validWords[wordIndex];
    
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
  }, []);

  // Calculate spins based on word length (word length + 2)
  const initialSpins = targetWord.length > 0 ? targetWord.length + 2 : 0;

  const [phase, setPhase] = useState<GamePhase>("spinning");
  const [spinsRemaining, setSpinsRemaining] = useState(initialSpins);
  const [money, setMoney] = useState(0);
  // Track revealed positions: array where each index corresponds to a position in the word
  const [revealedPositions, setRevealedPositions] = useState<(string | null)[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<number | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameResult, setGameResult] = useState<GameResult>(null);

  // Initialize revealed positions and spins when word is set
  useEffect(() => {
    if (targetWord.length > 0) {
      setRevealedPositions(Array(targetWord.length).fill(null));
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
    
    // Allow any word of the correct length (can't validate all English words)
    // Just check it's the right length and contains only letters
    if (!/^[A-Z]+$/.test(guess)) {
      alert("Please enter only letters!");
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
    } else if (guesses.length >= 5) {
      // Allow up to 6 guesses total (0-5 index), so after 6th guess (index 5), game over
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

  // Calculate wheel segment positions
  const segmentAngle = wheelSegments.length > 0 ? 360 / wheelSegments.length : 0;

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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Wheel of Fortune</h1>
      
      <div className="mb-6 text-center">
        <div className="text-xl mb-2">
          <span className="font-semibold">Money: </span>
          <span className="text-green-600">${money}</span>
        </div>
        {phase === "spinning" && (
          <div className="text-lg">
            <span className="font-semibold">Spins Remaining: </span>
            <span>{spinsRemaining}</span>
          </div>
        )}
      </div>

      {phase === "spinning" && (
        <div className="mb-8">
          {/* Wheel */}
          <div className="relative mx-auto mb-8" style={{ width: "500px", height: "500px" }}>
            <div
              className="absolute inset-0 rounded-full border-8 border-gray-800 shadow-2xl"
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
                        transform: "translate(180px, -50%)",
                        textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                      }}
                    >
                      <div className="text-lg">${segment.value}</div>
                      <div className="text-2xl font-extrabold">{segment.letter}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pointer */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10"
              style={{
                width: 0,
                height: 0,
                borderLeft: "20px solid transparent",
                borderRight: "20px solid transparent",
                borderTop: "40px solid #1f2937",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              }}
            />
            
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gray-800 rounded-full border-4 border-gray-600 z-10 flex items-center justify-center">
              <div className="text-white font-bold text-sm">SPIN</div>
            </div>
          </div>

          {/* Spin button */}
          {!isSpinning && selectedSegmentIndex === null && (
            <div className="text-center mb-6">
              <button
                onClick={handleSpin}
                disabled={spinsRemaining === 0}
                className="px-8 py-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-xl font-bold"
              >
                Spin the Wheel
              </button>
            </div>
          )}

          {/* Choice buttons after spin */}
          {selectedSegmentIndex !== null && !isSpinning && selectedSegmentIndex >= 0 && selectedSegmentIndex < wheelSegments.length && (
            <div className="text-center mb-6">
              <div className="mb-4 text-lg">
                <p className="font-semibold">You landed on:</p>
                <p className="text-2xl">
                  ${wheelSegments[selectedSegmentIndex].value} - Letter: {wheelSegments[selectedSegmentIndex].letter}
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleTakeMoney}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Take ${wheelSegments[selectedSegmentIndex].value}
                </button>
                <button
                  onClick={handleRevealLetter}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Reveal if "{wheelSegments[selectedSegmentIndex].letter}" is in word
                </button>
              </div>
            </div>
          )}

          {/* Word display with blank boxes */}
          <div className="mt-6 mb-6">
            <p className="text-center font-semibold mb-4">The Word:</p>
            <div className="flex gap-3 justify-center flex-wrap">
              {revealedPositions.map((letter, index) => (
                <div
                  key={index}
                  className={`w-16 h-16 flex items-center justify-center text-3xl font-bold rounded border-4 ${
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
            <div className="mb-6">
              <p className="text-center font-semibold mb-4">The Word:</p>
              <div className="flex gap-3 justify-center flex-wrap">
                {revealedPositions.map((letter, index) => (
                  <div
                    key={index}
                    className={`w-16 h-16 flex items-center justify-center text-3xl font-bold rounded border-4 ${
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
          <div className="space-y-2 mb-8">
            {Array.from({ length: 6 }).map((_, rowIndex) => {
              const guess = guesses[rowIndex] || "";
              return (
                <div key={rowIndex} className="flex gap-2 justify-center">
                  {Array.from({ length: targetWord.length }).map((_, colIndex) => {
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

          <form onSubmit={handleGuess} className="text-center">
            <div className="flex gap-4 items-center justify-center mb-2">
              <input
                type="text"
                value={currentGuess}
                onChange={(e) => setCurrentGuess(e.target.value.toUpperCase().slice(0, targetWord.length))}
                className="px-4 py-2 text-2xl text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 uppercase w-48"
                maxLength={targetWord.length}
                autoFocus
                disabled={money < 25}
                placeholder="Enter word"
              />
              <button
                type="submit"
                disabled={currentGuess.length !== targetWord.length || money < 25}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Guess (-$25)
              </button>
            </div>
            <p className="text-sm text-gray-500">
              {currentGuess.length}/{targetWord.length} letters
            </p>
          </form>
        </div>
      )}

      {phase === "finished" && (
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">
            {gameResult === "success" ? (
              <span className="text-green-600">Congratulations! You won!</span>
            ) : (
              <span className="text-red-600">Game Over!</span>
            )}
          </div>
          {gameResult === "failure" && (
            <p className="text-xl mb-4">The word was: <span className="font-bold">{targetWord}</span></p>
          )}
          <p className="text-lg mb-4">Final Money: <span className="font-semibold text-green-600">${money}</span></p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

