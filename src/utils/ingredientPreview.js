import { comparableQuantity } from '../mixins/units.js';

const ingredientName = (ingredient) => typeof ingredient === 'string'
  ? ingredient.trim()
  : String(ingredient?.name || '').trim();

/** Produce the compact ingredient line shown on recipe cards. */
export const buildIngredientPreview = (ingredients, limit = 3) => (ingredients || [])
  .map((ingredient, index) => ({
    name: ingredientName(ingredient),
    index,
    magnitude: typeof ingredient === 'string'
      ? null
      : comparableQuantity(ingredient.quantityRaw ?? ingredient.quantity, ingredient.unit),
  }))
  .filter((ingredient) => ingredient.name)
  .sort((a, b) => {
    const aMagnitude = a.magnitude ?? Number.NEGATIVE_INFINITY;
    const bMagnitude = b.magnitude ?? Number.NEGATIVE_INFINITY;
    return bMagnitude - aMagnitude || a.index - b.index;
  })
  .slice(0, limit)
  .map(({ name }) => name)
  .join(', ');
