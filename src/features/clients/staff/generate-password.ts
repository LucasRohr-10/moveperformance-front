export const GENERATED_PASSWORD_LENGTH = 12;

// No I, O, l, 0 or 1: they get mixed up when staff dictates the password over the phone or at the counter.
const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!#$%&*+-=?@_";
const ALL_CHARACTERS = UPPERCASE + LOWERCASE + DIGITS + SYMBOLS;

const UINT32_RANGE = 2 ** 32;

/** A uniform integer in [0, max): values that would skew the modulo are redrawn. */
function randomIndex(max: number): number {
  const unbiasedLimit = UINT32_RANGE - (UINT32_RANGE % max);
  const draw = new Uint32Array(1);
  do {
    crypto.getRandomValues(draw);
  } while (draw[0] >= unbiasedLimit);
  return draw[0] % max;
}

function randomCharacterOf(alphabet: string): string {
  return alphabet[randomIndex(alphabet.length)];
}

function shuffle(characters: string[]): string[] {
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const other = randomIndex(index + 1);
    [characters[index], characters[other]] = [characters[other], characters[index]];
  }
  return characters;
}

/** A readable 12-character password that meets the four registration hints. */
export function generatePassword(): string {
  const guaranteed = [UPPERCASE, LOWERCASE, DIGITS, SYMBOLS].map(randomCharacterOf);
  const rest = Array.from({ length: GENERATED_PASSWORD_LENGTH - guaranteed.length }, () =>
    randomCharacterOf(ALL_CHARACTERS),
  );
  return shuffle([...guaranteed, ...rest]).join("");
}
