// ============================================================
// Basic profanity filter — Hebrew + English
// Add words as lowercase; check is case-insensitive
// ============================================================

const BLOCKED_WORDS = [
  // Hebrew
  "זין", "כוס", "תזדיין", "זדיין", "מזדיין", "מזדיינת",
  "שרמוטה", "זונה", "בן זונה", "בת זונה", "מניאק",
  "יבן זונה", "לך תזדיין", "עזאזל", "כוסאמק", "כוסאמו",
  "מכוסמק", "נזדיין", "הזדיין", "תזיין", "מזיין",
  "פאקינג", "חרא", "דפוק", "מדופק", "אידיוט",
  // English
  "fuck", "shit", "bitch", "asshole", "cunt", "nigger",
  "faggot", "whore", "slut", "dick", "cock", "pussy",
  "motherfucker", "bastard",
];

/**
 * Returns true if the text contains a blocked word.
 */
export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some((word) => lower.includes(word));
}

/**
 * Returns an error message string if profanity found, null otherwise.
 */
export function profanityError(text: string): string | null {
  return containsProfanity(text) ? "התוכן אינו הולם — אנא שנה את הניסוח" : null;
}
