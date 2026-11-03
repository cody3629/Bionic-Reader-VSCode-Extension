/**
 * Pure Bionic-style text segmentation.
 * No VS Code APIs, I/O, or mutation: safe to unit test with Jest.
 */

/**
 * @param {string} text
 * @param {{ fixationStrength?: number, saccades?: number, minimumWordLength?: number, startLine?: number, endLine?: number }} options
 * startLine/endLine (0-based, inclusive) limit which lines produce ranges; saccade counting still starts at line 0.
 * @returns {Array<{ line: number, start: number, end: number, word: string }>}
 */
function getEmphasisRanges(text, options = {}) {
  const strength = clampNumber(options.fixationStrength, 0.35, 0.1, 1);
  const saccades = Math.floor(clampNumber(options.saccades, 0, 0, 10));
  const minimumWordLength = Math.floor(
    clampNumber(options.minimumWordLength, 1, 1, 20),
  );
  const startLine = Math.floor(clampNumber(options.startLine, 0, 0, Infinity));
  const endLine = Math.floor(
    clampNumber(options.endLine, Infinity, 0, Infinity),
  );

  const ranges = [];
  const wordPattern = /[\p{L}\p{N}_$]+/gu;
  const lines = String(text).split(/\r\n|\r|\n/);
  let eligibleWordIndex = 0;

  for (let line = 0; line < lines.length && line <= endLine; line += 1) {
    const sourceLine = lines[line];
    wordPattern.lastIndex = 0;
    let match;

    while ((match = wordPattern.exec(sourceLine)) !== null) {
      const word = match[0];
      const codePoints = [...word];
      if (codePoints.length < minimumWordLength) continue;

      const shouldEmphasize = eligibleWordIndex % (saccades + 1) === 0;
      eligibleWordIndex += 1;
      if (!shouldEmphasize || line < startLine) continue;

      const count = Math.max(
        1,
        Math.min(codePoints.length, Math.ceil(codePoints.length * strength)),
      );
      const emphasizedPrefix = codePoints.slice(0, count).join("");
      ranges.push({
        line,
        start: match.index,
        end: match.index + emphasizedPrefix.length,
        word,
      });
    }
  }

  return ranges;
}

function clampNumber(value, fallback, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, number));
}

module.exports = { getEmphasisRanges };
