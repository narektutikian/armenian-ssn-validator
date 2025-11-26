export type Sex = "male" | "female";

export interface ValidationOptions {
  /**
   * Optional check digit validator. If omitted, any numeric check digit is accepted
   * because the official algorithm is not publicly documented.
   */
  checkDigitValidator?: (base: string, checkDigit: string) => boolean;
}

export interface GenerationOptions {
  sex?: Sex;
  sequence?: number;
  /**
   * Supplies a check digit generator. Defaults to a simple mod-10 checksum for
   * reproducible results during testing.
   */
  checkDigitGenerator?: (base: string) => string;
  /**
   * Prevent producing SSNs with three consecutive sixes. Enabled by default.
   */
  preventTripleSix?: boolean;
}

const centuryOffsets: Array<{ start: number; end: number; offset: number }> = [
  { start: 1800, end: 1899, offset: 80 }, // 19th century
  { start: 1900, end: 1999, offset: 0 }, // 20th century
  { start: 2000, end: 2099, offset: 20 }, // 21st century
  { start: 2100, end: 2199, offset: 40 }, // 22nd century
  { start: 2200, end: 2299, offset: 60 } // 23rd century
];

function normalizeDate(input: Date | string): Date | null {
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function pad(value: number, length: number): string {
  return value.toString().padStart(length, "0");
}

function getCenturyOffset(year: number): number | null {
  for (const entry of centuryOffsets) {
    if (year >= entry.start && year <= entry.end) {
      return entry.offset;
    }
  }

  return null;
}

function getMonthCode(date: Date): string | null {
  const month = date.getMonth() + 1;
  const offset = getCenturyOffset(date.getFullYear());
  if (offset === null) {
    return null;
  }

  // Month code is the calendar month plus the century-specific offset from the
  // documented ranges (01-12, 21-32, 41-52, 61-72, 81-92).
  const code = month + offset;
  return pad(code, 2);
}

function getDayCodes(day: number): { male: string; female: string } | null {
  if (day < 1 || day > 31) {
    return null;
  }

  return {
    male: pad(day + 10, 2),
    female: pad(day + 50, 2)
  };
}

function defaultCheckDigit(base: string): string {
  const sum = base
    .split("")
    .map((digit) => Number(digit))
    .reduce((acc, digit) => acc + digit, 0);

  return String(sum % 10);
}

function hasTripleSix(value: string): boolean {
  return /666/.test(value);
}

function isNumeric(value: string): boolean {
  return /^[0-9]+$/.test(value);
}

export function validateSSN(
  ssn: string,
  birthDate: Date | string,
  options?: ValidationOptions
): boolean {
  const date = normalizeDate(birthDate);
  if (!date) {
    return false;
  }

  const normalized = ssn.replace(/\s+/g, "");
  if (normalized.length !== 10 || !isNumeric(normalized)) {
    return false;
  }

  if (hasTripleSix(normalized)) {
    return false;
  }

  const dayCodes = getDayCodes(date.getDate());
  if (!dayCodes) {
    return false;
  }

  const monthCode = getMonthCode(date);
  if (!monthCode) {
    return false;
  }

  const yearCode = pad(date.getFullYear() % 100, 2);
  const daySegment = normalized.slice(0, 2);
  const monthSegment = normalized.slice(2, 4);
  const yearSegment = normalized.slice(4, 6);
  const sequenceSegment = normalized.slice(6, 9);
  const checkDigit = normalized.slice(9);

  const dayMatches =
    daySegment === dayCodes.male || daySegment === dayCodes.female;
  if (!dayMatches) {
    return false;
  }

  if (monthSegment !== monthCode) {
    return false;
  }

  if (yearSegment !== yearCode) {
    return false;
  }

  const sequenceNumber = Number(sequenceSegment);
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1 || sequenceNumber > 999) {
    return false;
  }

  if (options?.checkDigitValidator) {
    const base = normalized.slice(0, 9);
    if (!options.checkDigitValidator(base, checkDigit)) {
      return false;
    }
  } else if (!isNumeric(checkDigit)) {
    return false;
  }

  return true;
}

export function generateSSN(
  birthDate: Date | string,
  options?: GenerationOptions
): string {
  const date = normalizeDate(birthDate);
  if (!date) {
    throw new Error("Invalid birth date");
  }

  const preventTripleSix = options?.preventTripleSix ?? true;
  const sex: Sex =
    options?.sex ?? (Math.random() < 0.5 ? "male" : "female");
  const dayCodes = getDayCodes(date.getDate());
  if (!dayCodes) {
    throw new Error("Birth day must be between 1 and 31");
  }

  const monthCode = getMonthCode(date);
  if (!monthCode) {
    throw new Error("Birth year is outside supported centuries (19th-23rd)");
  }

  const yearCode = pad(date.getFullYear() % 100, 2);
  const daySegment = sex === "male" ? dayCodes.male : dayCodes.female;
  const checkDigitGenerator = options?.checkDigitGenerator ?? defaultCheckDigit;
  const sequenceStart =
    options?.sequence && options.sequence >= 1 && options.sequence <= 999
      ? options.sequence
      : Math.floor(Math.random() * 999) + 1;

  let attempts = 0;
  let sequence = sequenceStart;
  const checkDigitValidator = (base: string, digit: string) =>
    digit === checkDigitGenerator(base);

  while (attempts < 1000) {
    const sequenceSegment = pad(sequence, 3);
    const base = `${daySegment}${monthCode}${yearCode}${sequenceSegment}`;
    const checkDigit = checkDigitGenerator(base);
    const candidate = `${base}${checkDigit}`;

    const failsTripleSix = preventTripleSix && hasTripleSix(candidate);
    const isValid = validateSSN(candidate, date, {
      checkDigitValidator
    });

    if (!failsTripleSix && isValid) {
      return candidate;
    }

    sequence = sequence % 999 === 0 ? 1 : (sequence % 999) + 1;
    attempts += 1;
  }

  throw new Error("Unable to generate SSN without forbidden patterns");
}
