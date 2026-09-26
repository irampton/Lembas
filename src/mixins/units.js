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

const parseQuantity = (quantity) => {
  const parts = (quantity || '').toString().trim().split(/\s+/).filter(Boolean);
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

export const formatUnit = (value, quantity) => {
  const definition = getUnit(value);
  if (!definition) return value || '';
  if (definition.value === 'cup') {
    return parseQuantity(quantity) === 1 ? 'cup' : 'cups';
  }
  return definition.abbreviation;
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
    convertUnit,
    normalizeUnit,
  },
};
