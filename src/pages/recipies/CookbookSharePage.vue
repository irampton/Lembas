<template>
  <section>
    <div
      v-if="loading"
    >
      <p>Loading shared cookbook…</p>
    </div>

    <div
      v-else-if="error"
    >
      <p>Unable to load shared cookbook</p>
      <p>{{ error }}</p>
    </div>

    <div v-else-if="cookbook">
      <div>
        <div>
          <div>
            <p>Shared cookbook</p>
            <h1>{{ cookbook.name }}</h1>
            <p>by {{ ownerName }}</p>
          </div>
          <div>
            <span
            >
              <span></span>
              <span>{{ recipes.length }} {{ recipes.length === 1 ? 'recipe' : 'recipes' }}</span>
            </span>
            <span
            >
              Public link
            </span>
          </div>
        </div>
        <p v-if="cookbook.description">{{ cookbook.description }}</p>
      </div>

      <div
        v-if="!recipes.length"
      >
        No recipes have been added to this cookbook yet.
      </div>

      <div v-else>
        <aside>
          <div>
            <span>Recipes</span>
            <span>{{ recipes.length }}</span>
          </div>
          <div>
            <button
              v-for="recipe in recipes"
              :key="recipe.id"
              type="button"
              @click="selectedId = recipe.id"
            >
              <span>{{ recipe.title }}</span>
              <span>{{ servingsShort(recipe) }}</span>
            </button>
          </div>
        </aside>

        <article
          v-if="selectedRecipe"
        >
          <div>
            <div>
              <h2>{{ selectedRecipe.title }}</h2>
              <p v-if="selectedRecipe.description">{{ selectedRecipe.description }}</p>
              <p v-if="metaLine(selectedRecipe)">
                {{ metaLine(selectedRecipe) }}
              </p>
              <div>
                <span v-for="tag in selectedRecipe.tags" :key="`${selectedRecipe.id}-${tag}`">
                  <span>{{ tag }}</span>
                </span>
                <span v-if="!selectedRecipe.tags?.length">No tags yet</span>
              </div>
            </div>
            <div
            >
              <span></span>
              <span>{{ servingsLabel(selectedRecipe) }}</span>
            </div>
          </div>

          <div>
            <div>
              <p>Ingredients</p>
              <ul>
                <li
                  v-for="(item, idx) in selectedRecipe.ingredients"
                  :key="item.id || idx"
                >
                  <span>{{ item.quantity }}</span>
                  <span>{{ formatUnit(item.unit, item.quantity) }}</span>
                  <span>{{ item.name }}</span>
                </li>
                <li v-if="!selectedRecipe.ingredients?.length">No ingredients listed.</li>
              </ul>
            </div>

            <div>
              <p>Steps</p>
              <ol>
                <li
                  v-for="(step, index) in selectedRecipe.steps"
                  :key="`${selectedRecipe.id}-step-${index}`"
                >
                  <span>Step {{ index + 1 }}</span>
                  <p>{{ step || 'No instructions yet.' }}</p>
                </li>
                <li v-if="!selectedRecipe.steps?.length">No steps yet.</li>
              </ol>
            </div>
          </div>

          <div>
            <p>Notes</p>
            <p v-if="selectedRecipe.notes">{{ selectedRecipe.notes }}</p>
            <p v-else>No notes added.</p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const loading = ref(false);
const error = ref(null);
const cookbook = ref(null);
const recipes = ref([]);
const selectedId = ref('');

const token = computed(() => route.params.token);
const ownerName = computed(() => cookbook.value?.ownerUsername || 'Unknown cook');
const accentColor = computed(() => cookbook.value?.color || '#fb923c');
const selectedRecipe = computed(() => recipes.value.find((r) => r.id === selectedId.value) || recipes.value[0] || null);

const loadShare = async () => {
  if (!token.value) return;
  loading.value = true;
  error.value = null;
  try {
    const res = await fetch(`/api/cookbook-share/${token.value}`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to load cookbook.');
    cookbook.value = data.cookbook;
    recipes.value = data.recipes || [];
    selectedId.value = data.recipes?.[0]?.id || '';
  } catch (err) {
    error.value = err.message || 'Unable to load cookbook.';
  } finally {
    loading.value = false;
  }
};

const formattedDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const metaLine = (recipe) => {
  const parts = [];
  if (recipe?.author) parts.push(recipe.author);
  const created = formattedDate(recipe?.createdAt);
  if (created) parts.push(created);
  return parts.join(' • ');
};

const servingsLabel = (recipe) => {
  const qty = recipe?.servingsQuantity?.toString?.().trim?.() || '';
  const unit = recipe?.servingsUnit?.toString?.().trim?.() || '';
  const combined = [qty, unit].filter(Boolean).join(' ').trim();
  return combined ? `Serves ${combined}` : 'Shared recipe';
};

const servingsShort = (recipe) => {
  const qty = recipe?.servingsQuantity?.toString?.().trim?.() || '';
  const unit = recipe?.servingsUnit?.toString?.().trim?.() || '';
  const combined = [qty, unit].filter(Boolean).join(' ').trim();
  return combined || '—';
};

const abbreviations = {
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tbsp: 'tbsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tsp: 'tsp',
  gram: 'g',
  grams: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  ounce: 'oz',
  ounces: 'oz',
  milliliter: 'ml',
  milliliters: 'ml',
  liter: 'l',
  liters: 'l',
  piece: 'pc',
  pieces: 'pc',
  pinch: 'pinch',
};

const parseQuantityNumber = (quantity) => {
  const val = (quantity || '').toString().trim();
  if (!val) return null;
  const parts = val.split(' ');
  let total = 0;
  parts.forEach((part) => {
    if (part.includes('/')) {
      const [num, den] = part.split('/').map(Number);
      if (!Number.isNaN(num) && !Number.isNaN(den) && den !== 0) total += num / den;
    } else {
      const n = Number(part);
      if (!Number.isNaN(n)) total += n;
    }
  });
  return total || null;
};

const formatUnit = (unit, quantity) => {
  const key = (unit || '').toLowerCase().trim();
  if (key === 'cup' || key === 'cups') {
    const qtyNum = parseQuantityNumber(quantity);
    const isSingular = qtyNum === 1;
    return isSingular ? 'cup' : 'cups';
  }
  return abbreviations[key] || unit;
};

watch(
  () => token.value,
  () => loadShare(),
  { immediate: true }
);
</script>
