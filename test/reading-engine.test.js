const { getEmphasisRanges } = require("../src/reading-engine");

const words = (ranges) => ranges.map((range) => range.word);

test("fixation strength controls emphasized character count", () => {
  const text = "accessibility";
  expect(getEmphasisRanges(text, { fixationStrength: 0.25 })[0].end).toBe(4);
  expect(getEmphasisRanges(text, { fixationStrength: 0.5 })[0].end).toBe(7);
  expect(getEmphasisRanges(text, { fixationStrength: 1 })[0].end).toBe(
    text.length,
  );
});

test("fixation always emphasizes at least one character", () => {
  const result = getEmphasisRanges("a", { fixationStrength: 0.1 });
  expect(result.map(({ start, end }) => [start, end])).toEqual([[0, 1]]);
});

test("saccades skip the requested number of eligible words", () => {
  expect(
    words(getEmphasisRanges("one two three four five", { saccades: 0 })),
  ).toEqual(["one", "two", "three", "four", "five"]);
  expect(
    words(getEmphasisRanges("one two three four five", { saccades: 1 })),
  ).toEqual(["one", "three", "five"]);
  expect(
    words(getEmphasisRanges("one two three four five", { saccades: 2 })),
  ).toEqual(["one", "four"]);
});

test("minimum word length excludes short words and they do not count toward saccades", () => {
  const result = getEmphasisRanges("if value is not okay", {
    minimumWordLength: 3,
    saccades: 1,
  });
  expect(words(result)).toEqual(["value", "okay"]);
});

test("ranges preserve correct line and character offsets", () => {
  const result = getEmphasisRanges("const value = 1;\nreturn value;", {
    fixationStrength: 1,
  });
  expect(result.map(({ line, start, end }) => [line, start, end])).toEqual([
    [0, 0, 5],
    [0, 6, 11],
    [0, 14, 15],
    [1, 0, 6],
    [1, 7, 12],
  ]);
});

test("handles CRLF and Unicode letters", () => {
  const result = getEmphasisRanges("café\r\nnaïve", { fixationStrength: 1 });
  expect(result.map(({ line, word }) => [line, word])).toEqual([
    [0, "café"],
    [1, "naïve"],
  ]);
});

test("fixation ranges keep astral Unicode characters intact", () => {
  const result = getEmphasisRanges("𐐀𐐁ab", { fixationStrength: 0.35 });
  expect(result.map(({ start, end, word }) => [start, end, word])).toEqual([
    [0, 4, "𐐀𐐁ab"],
  ]);
});

test("minimum length and saccades are clamped safely", () => {
  expect(
    words(getEmphasisRanges("a bb ccc dddd", { minimumWordLength: 0 })),
  ).toEqual(["a", "bb", "ccc", "dddd"]);
  expect(words(getEmphasisRanges("one two", { saccades: 99 }))).toEqual([
    "one",
  ]);
});

test("does not mutate the source text", () => {
  const source = 'const untouched = "source";\nrun(untouched);';
  const before = source;
  getEmphasisRanges(source, { fixationStrength: 0.7, saccades: 1 });
  expect(source).toBe(before);
});

test("empty input returns no ranges", () => {
  expect(getEmphasisRanges("")).toEqual([]);
});

test("identifiers with underscores, dollar signs and digits are single words", () => {
  expect(words(getEmphasisRanges("$value_1 2x"))).toEqual(["$value_1", "2x"]);
});

test("non-numeric options fall back to defaults", () => {
  const result = getEmphasisRanges("abc def", {
    fixationStrength: "x",
    saccades: NaN,
    minimumWordLength: undefined,
  });
  expect(result.map(({ word, end }) => [word, end])).toEqual([
    ["abc", 2],
    ["def", 6],
  ]);
});

test("a lone carriage return starts a new line", () => {
  const result = getEmphasisRanges("ab\rcd");
  expect(result.map(({ line, word }) => [line, word])).toEqual([
    [0, "ab"],
    [1, "cd"],
  ]);
});
