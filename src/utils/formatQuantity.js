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

const asciiFractionPattern = new RegExp(
  `(?<![\\d/])(${Object.keys(unicodeFractions)
    .sort((a, b) => b.length - a.length)
    .map((fraction) => fraction.replace("/", "\\/"))
    .join("|")})(?![\\d/])`,
  "g",
);
const unicodeFractionPattern = new RegExp(
  `\\s+(?=[${Object.values(unicodeFractions).join("")}])`,
  "g",
);

export const formatQuantity = (value) =>
  String(value ?? "")
    .replace(asciiFractionPattern, (fraction) => unicodeFractions[fraction])
    .replace(unicodeFractionPattern, "");
