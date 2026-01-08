"""
Word Filter Script with Lemmatization
------------------------------------
Reads words from 'words.txt', applies formatting and linguistic rules,
lemmatizes words to their base (infinitive) form, and outputs valid words
to 'words_final.txt'.

Each rule is modular and can be added or removed easily.
"""

import re
import nltk
from nltk.corpus import wordnet
from nltk.stem import WordNetLemmatizer


lemmatizer = WordNetLemmatizer()


# =========================
# HELPER FUNCTIONS
# =========================

def get_wordnet_pos(word: str):
    """
    Determines the most likely WordNet POS tag for a word.
    This improves lemmatization accuracy.
    """
    tag = nltk.pos_tag([word])[0][1][0].upper()
    return {
        "J": wordnet.ADJ,
        "V": wordnet.VERB,
        "N": wordnet.NOUN,
        "R": wordnet.ADV
    }.get(tag, wordnet.NOUN)


def lemmatize(word: str) -> str:
    """
    Returns the lemma (base form) of a word using WordNet.
    """
    pos = get_wordnet_pos(word)
    return lemmatizer.lemmatize(word, pos)


# =========================
# RULE DEFINITIONS
# =========================

def letters_only(word: str) -> bool:
    """
    Rule: Word must contain only lowercase alphabetic characters.
    """
    return bool(re.fullmatch(r"[a-z]+", word))


def lowercase_only(word: str) -> bool:
    """
    Rule: Word must be lowercase.
    """
    return word.islower()


def must_be_base_form(word: str) -> bool:
    """
    Rule: Word must already be in its lemmatized (base / infinitive) form.

    Rejects:
    - plural nouns
    - conjugated verbs
    - adverbs
    - comparative/superlative adjectives
    """
    return word == lemmatize(word)


def not_adverb(word: str) -> bool:
    """
    Rule: Reject adverbs explicitly.
    """
    pos = nltk.pos_tag([word])[0][1]
    return not pos.startswith("R")


def minimum_length(word: str, min_len: int = 3) -> bool:
    """
    Rule: Enforces a minimum word length.
    """
    return len(word) >= min_len


# =========================
# RULE CONFIGURATION
# =========================
# Enable or disable rules here.

RULES = [
    letters_only,
    lowercase_only,
    must_be_base_form,
    not_adverb,
    minimum_length,
]


# =========================
# MAIN PROCESSING LOGIC
# =========================

def apply_rules(word: str) -> bool:
    """
    Applies all active rules to a word.
    """
    for rule in RULES:
        if not rule(word):
            return False
    return True


def main():
    input_file = "words.txt"
    output_file = "words_final.txt"

    with open(input_file, "r", encoding="utf-8") as infile:
        words = [line.strip() for line in infile if line.strip()]

    filtered_words = [word for word in words if apply_rules(word)]

    with open(output_file, "w", encoding="utf-8") as outfile:
        for word in filtered_words:
            outfile.write(word + "\n")

    print(f"Filtered {len(filtered_words)} words written to {output_file}")


if __name__ == "__main__":
    main()
