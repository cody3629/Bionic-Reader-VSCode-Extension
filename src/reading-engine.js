/**
 * Pure Bionic-style text segmentation.
 * No VS Code APIs, I/O, or mutation: safe to unit test with Jest.
 */

/**
 * @param {string} text
 * @param {{ fixationStrength?: number, saccades?: number, minimumWordLength?: number }} options
 * @returns {Array<{ line: number, start: number, end: number, word: string }>}
 */
/**
 * @param {Array<{ line: number, text: string }>} lines
 * @param {{ fixationStrength?: number, saccades?: number, minimumWordLength?: number, eligibleWordOffset?: number }} options
 * @returns {Array<{ line: number, start: number, end: number, word: string }>}
 */
function getEmphasisRanges(text, options = {}) {
  const lines = String(text)
    .split(/\r\n|\r|\n/)
    .map((lineText, line) => ({ line, text: lineText }));
  return getEmphasisRangesForLines(lines, options);
}
//TODO: Figure out why extension isn't working on source control view
function getEmphasisRangesForLines(lines, options = {}) {
  const strength = clampNumber(options.fixationStrength, 0.35, 0.1, 1);
  const saccades = Math.floor(clampNumber(options.saccades, 0, 0, 10));
  const minimumWordLength = normalizeMinimumWordLength(
    options.minimumWordLength,
  );
  let eligibleWordIndex = Math.floor(
    clampNumber(options.eligibleWordOffset, 0, 0, Infinity),
  );
  const ranges = [];

  for (const { line, text } of lines) {
    for (const { match, codePoints } of findEligibleWords(
      text,
      minimumWordLength,
    )) {
      const shouldEmphasize = eligibleWordIndex % (saccades + 1) === 0;
      eligibleWordIndex += 1;
      if (!shouldEmphasize) continue;

      const count = Math.max(
        1,
        Math.min(codePoints.length, Math.ceil(codePoints.length * strength)),
      );
      const emphasizedPrefix = codePoints.slice(0, count).join("");
      ranges.push({
        line,
        start: match.index,
        end: match.index + emphasizedPrefix.length,
        word: match[0],
      });
    }
  }

  return ranges;
}

function countEligibleWords(text, minimumWordLength = 1) {
  let count = 0;
  for (const _word of findEligibleWords(
    text,
    normalizeMinimumWordLength(minimumWordLength),
  )) {
    count += 1;
  }
  return count;
}

// Words shorter than the minimum are skipped and do not count toward saccades.
function* findEligibleWords(text, minimumWordLength) {
  const wordPattern = /[\p{L}\p{N}_$][\p{L}\p{N}\p{M}_$]*/gu;
  let match;

  while ((match = wordPattern.exec(text)) !== null) {
    const codePoints = [...match[0]];
    if (codePoints.length >= minimumWordLength) yield { match, codePoints };
  }
}

function normalizeMinimumWordLength(value) {
  return Math.floor(clampNumber(value, 1, 1, 20));
}

function clampNumber(value, fallback, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, number));
}

module.exports = {
  countEligibleWords,
  getEmphasisRanges,
  getEmphasisRangesForLines,
};
