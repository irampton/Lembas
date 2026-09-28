const unicodeFractions = {
  "1/2": "½",
  "1/3": "⅓",
  "2/3": "⅔",
  "1/4": "¼",
  "3/4": "¾",
  "1/5": "⅕",
  "2/5": "⅖",
  "3/5": "⅗",
  "4/5": "⅘",
  "1/6": "⅙",
  "5/6": "⅚",
  "1/7": "⅐",
  "1/8": "⅛",
  "3/8": "⅜",
  "5/8": "⅝",
  "7/8": "⅞",
  "1/9": "⅑",
  "1/10": "⅒",
};

const superscriptDigits = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const subscriptDigits = "₀₁₂₃₄₅₆₇₈₉";
const toSuperscript = (value) =>
  String(value).replace(/\d/g, (digit) => superscriptDigits[digit]);
const toSubscript = (value) =>
  String(value).replace(/\d/g, (digit) => subscriptDigits[digit]);
const formatFraction = (fraction) => {
  const [numerator, denominator] = fraction.split("/");
  return unicodeFractions[fraction] || `${toSuperscript(numerator)}⁄${toSubscript(denominator)}`;
};

const asciiFractionPattern = new RegExp(
  "(?<![\\d/])(\\d+\\/\\d+)(?![\\d/])",
  "g",
);
const unicodeFractionPattern = new RegExp(
  `\\s+(?=[${Object.values(unicodeFractions).join("")}]|[${superscriptDigits}]+⁄[${subscriptDigits}]+)`,
  "g",
);

export const formatQuantity = (value) =>
  String(value ?? "")
    .replace(asciiFractionPattern, formatFraction)
    .replace(unicodeFractionPattern, "");
