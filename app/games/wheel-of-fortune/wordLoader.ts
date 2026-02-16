// Utility to load words from text files
// Since these are large files, we'll load them asynchronously

let allWordsCache: Set<string> | null = null;
let targetWordsCache: string[] | null = null;

export async function loadAllWords(): Promise<Set<string>> {
  if (allWordsCache) {
    return allWordsCache;
  }

  try {
    const response = await fetch('/wheel-of-fortune/words.txt');
    if (!response.ok) {
      throw new Error(`Failed to fetch words.txt: ${response.status}`);
    }
    const text = await response.text();
    const words = text
      .split('\n')
      .map(word => word.trim().toUpperCase())
      .filter(word => word.length >= 5 && word.length <= 9 && /^[A-Z]+$/.test(word));
    
    allWordsCache = new Set(words);
    return allWordsCache;
  } catch (error) {
    console.error('Failed to load words.txt:', error);
    // Return empty set as fallback
    return new Set<string>();
  }
}

export async function loadTargetWords(): Promise<string[]> {
  if (targetWordsCache) {
    return targetWordsCache;
  }

  try {
    const response = await fetch('/wheel-of-fortune/words_final.txt');
    if (!response.ok) {
      throw new Error(`Failed to fetch words_final.txt: ${response.status}`);
    }
    const text = await response.text();
    const words = text
      .split('\n')
      .map(word => word.trim().toUpperCase())
      .filter(word => word.length >= 5 && word.length <= 9 && /^[A-Z]+$/.test(word));
    
    targetWordsCache = words;
    return targetWordsCache;
  } catch (error) {
    console.error('Failed to load words_final.txt:', error);
    // Return empty array as fallback
    return [];
  }
}

