const BASE_UNITS = Object.freeze({ mass: 'g', volume: 'ml', length: 'mm', count: 'piece' });
const unit = (value, name, abbreviation, dimension, toBase, aliases = []) =>
  Object.freeze({
    value,
    name,
    abbreviation,
    dimension,
    conversion: toBase == null
      ? null
      : Object.freeze({ baseUnit: BASE_UNITS[dimension], factor: toBase }),
    aliases: Object.freeze(aliases),
  });

// Conversion factors use grams for mass, milliliters for volume, millimeters
// for length, and pieces for count. US customary volume definitions are used.
// A null conversion means the unit depends on the ingredient or packaging.
export const UNITS = Object.freeze([
  unit('mg', 'Milligram', 'mg', 'mass', 0.001, ['milligram', 'milligrams']),
  unit('g', 'Gram', 'g', 'mass', 1, ['gram', 'grams']),
  unit('kg', 'Kilogram', 'kg', 'mass', 1000, ['kilogram', 'kilograms', 'kgs']),
  unit('oz', 'Ounce', 'oz', 'mass', 28.349523125, ['ounce', 'ounces']),
  unit('lb', 'Pound', 'lb', 'mass', 453.59237, ['pound', 'pounds', 'lbs']),

  unit('ml', 'Milliliter', 'ml', 'volume', 1, ['milliliter', 'milliliters', 'millilitre', 'millilitres']),
  unit('cl', 'Centiliter', 'cl', 'volume', 10, ['centiliter', 'centiliters', 'centilitre', 'centilitres']),
  unit('dl', 'Deciliter', 'dl', 'volume', 100, ['deciliter', 'deciliters', 'decilitre', 'decilitres']),
  unit('l', 'Liter', 'L', 'volume', 1000, ['liter', 'liters', 'litre', 'litres']),
  unit('tsp', 'Teaspoon', 'tsp', 'volume', 4.92892159375, ['teaspoon', 'teaspoons', 'tsps', 't']),
  unit('tbsp', 'Tablespoon', 'tbsp', 'volume', 14.78676478125, ['tablespoon', 'tablespoons', 'tbs', 'tablespoonful']),
  unit('fl oz', 'Fluid ounce', 'fl oz', 'volume', 29.5735295625, ['fluid ounce', 'fluid ounces', 'floz']),
  unit('cup', 'Cup', 'cup', 'volume', 236.5882365, ['cups', 'c']),
  unit('pt', 'Pint', 'pt', 'volume', 473.176473, ['pint', 'pints']),
  unit('qt', 'Quart', 'qt', 'volume', 946.352946, ['quart', 'quarts']),
  unit('gal', 'Gallon', 'gal', 'volume', 3785.411784, ['gallon', 'gallons']),

  unit('mm', 'Millimeter', 'mm', 'length', 1, ['millimeter', 'millimeters', 'millimetre', 'millimetres']),
  unit('cm', 'Centimeter', 'cm', 'length', 10, ['centimeter', 'centimeters', 'centimetre', 'centimetres']),
  unit('in', 'Inch', 'in', 'length', 25.4, ['inch', 'inches']),

  unit('piece', 'Piece', 'pc', 'count', 1, ['pieces', 'pc', 'pcs', 'each']),
  unit('dozen', 'Dozen', 'doz', 'count', 12, ['dozens', 'doz']),
  unit('pinch', 'Pinch', 'pinch', 'portion', null, ['pinches']),
  unit('dash', 'Dash', 'dash', 'portion', null, ['dashes']),
  unit('drop', 'Drop', 'drop', 'portion', null, ['drops']),
  unit('clove', 'Clove', 'clove', 'portion', null, ['cloves']),
  unit('bunch', 'Bunch', 'bunch', 'portion', null, ['bunches']),
  unit('head', 'Head', 'head', 'portion', null, ['heads']),
  unit('sprig', 'Sprig', 'sprig', 'portion', null, ['sprigs']),
  unit('stalk', 'Stalk', 'stalk', 'portion', null, ['stalks']),
  unit('slice', 'Slice', 'slice', 'portion', null, ['slices']),
  unit('stick', 'Stick', 'stick', 'portion', null, ['sticks']),
  unit('can', 'Can', 'can', 'package', null, ['cans', 'tin', 'tins']),
  unit('jar', 'Jar', 'jar', 'package', null, ['jars']),
  unit('package', 'Package', 'pkg', 'package', null, ['packages', 'packet', 'packets', 'pack', 'packs', 'pkg']),
  unit('box', 'Box', 'box', 'package', null, ['boxes']),
  unit('bag', 'Bag', 'bag', 'package', null, ['bags']),
  unit('bottle', 'Bottle', 'bottle', 'package', null, ['bottles']),
]);

export const UNIT_VALUES = Object.freeze(UNITS.map(({ value }) => value));

const cleanUnit = (value) => (value || '').toString().trim().replace(/\./g, '').toLowerCase();
const unitLookup = new Map();

UNITS.forEach((definition) => {
  [definition.value, definition.name, definition.abbreviation, ...definition.aliases]
    .map(cleanUnit)
    .filter(Boolean)
    .forEach((alias) => unitLookup.set(alias, definition));
});

export const getUnit = (value) => unitLookup.get(cleanUnit(value));
export const normalizeUnit = (value) => getUnit(value)?.value || '';

// Keep programmatically populated unit inputs consistent with the label that
// UnitAutocomplete commits when a user leaves the field.
export const normalizeUnitAutocompleteValue = (value) => {
  const input = (value ?? '').toString();
  const lowered = input.trim().toLowerCase();
  const match = UNITS.find((definition) =>
    [definition.name, definition.abbreviation]
      .some((candidate) => candidate.toLowerCase() === lowered),
  );
  return match?.name || input;
};

const unicodeFractions = Object.freeze({
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6',
  '⅚': '5/6', '⅐': '1/7', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8',
  '⅞': '7/8', '⅑': '1/9', '⅒': '1/10',
});

const superscriptDigitValues = Object.freeze({
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
});
const subscriptDigitValues = Object.freeze({
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
});
const composedUnicodeFractionPattern = /([⁰¹²³⁴⁵⁶⁷⁸⁹]+)⁄([₀₁₂₃₄₅₆₇₈₉]+)/g;
const fromUnicodeDigits = (value, values) =>
  [...value].map((digit) => values[digit]).join('');

export const parseQuantity = (quantity) => {
  const normalized = (quantity || '').toString()
    .replace(
      composedUnicodeFractionPattern,
      (_, numerator, denominator) =>
        ` ${fromUnicodeDigits(numerator, superscriptDigitValues)}/${fromUnicodeDigits(denominator, subscriptDigitValues)} `,
    )
    .replace(
      /[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒]/g,
      (fraction) => ` ${unicodeFractions[fraction]} `,
    );
  const parts = normalized.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  let total = 0;
  for (const part of parts) {
    if (part.includes('/')) {
      const [numerator, denominator] = part.split('/').map(Number);
      if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
      total += numerator / denominator;
    } else {
      const value = Number(part);
      if (!Number.isFinite(value)) return null;
      total += value;
    }
  }
  return total;
};

// This provides a common magnitude for preview sorting. Dimensions remain
// intentionally approximate across mass, volume, and count, but equivalent
// units within each dimension (for example cups and tablespoons) compare
// correctly using the conversion table above.
export const comparableQuantity = (quantity, unitValue) => {
  const definition = getUnit(unitValue);
  const amount = parseQuantity(quantity);
  if (!definition?.conversion || !Number.isFinite(amount)) return null;
  return amount * definition.conversion.factor;
};

export const formatUnit = (value, quantity) => {
  const definition = getUnit(value);
  if (!definition) return value || '';
  if (definition.value === 'cup') {
    return parseQuantity(quantity) === 1 ? 'cup' : 'cups';
  }
  return definition.abbreviation;
};

// Keep small metric volumes legible without suggesting more precision than a
// kitchen measure can provide. The selected fractional cooking measures are
// displayed as decimals, capped at two places.
export const formatMilliliters = (amount) => {
  if (!Number.isFinite(amount)) return '';
  const formatDecimal = (value) => `${Math.round(value * 100) / 100}`;
  if (amount >= 20) return formatDecimal(Math.round(amount));
  if (amount >= 10) return formatDecimal(Math.round(amount * 2) / 2);

  const whole = Math.floor(amount);
  const candidates = [
    whole,
    whole + 1 / 4,
    whole + 1 / 3,
    whole + 1 / 2,
    whole + 2 / 3,
    whole + 3 / 4,
    whole + 1,
  ];
  const rounded = candidates.reduce((closest, candidate) =>
    Math.abs(amount - candidate) <= Math.abs(amount - closest) ? candidate : closest,
  );
  return formatDecimal(rounded);
};

export const convertUnit = (quantity, fromValue, toValue) => {
  const from = getUnit(fromValue);
  const to = getUnit(toValue);
  const amount = Number(quantity);
  if (!from || !to || !Number.isFinite(amount) || from.dimension !== to.dimension || !from.conversion || !to.conversion) {
    return null;
  }
  return (amount * from.conversion.factor) / to.conversion.factor;
};

export default {
  data() {
    return { units: UNITS };
  },
  methods: {
    formatUnit,
    formatMilliliters,
    convertUnit,
    normalizeUnit,
  },
};
