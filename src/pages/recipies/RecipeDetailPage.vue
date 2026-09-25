<template>
  <div class="flex flex-row justify-between">
    <div></div>
    <section class="m-2 w-full md:w-2/3">
      <div v-if="!isShareRoute && store.state.loading && !store.state.ready">
        Loading recipe…
      </div>

      <div v-else-if="isShareRoute && shareLoading">
        <p>Loading shared recipe…</p>
      </div>

      <div v-else-if="!recipe && !isShareRoute">
        <p>Recipe not found</p>
        <p>It might have been removed or not saved yet. Create a new one to get started.</p>
        <div>
          <RouterLink :to="{ name: 'recipe-new' }">
            <PlusIcon />
            Create recipe
          </RouterLink>
          <RouterLink :to="{ name: 'home' }">
            Go home
          </RouterLink>
        </div>
      </div>

      <div v-else-if="shareError">
        <p>Unable to load shared recipe</p>
        <p>{{ shareError }}</p>
      </div>

      <div v-else>
          <div class="flex flex-row justify-between">
            <div class="font-bold text-2xl border-b-2 border-solid">{{ recipe.title }}</div>
            <div class="text-right">
              <ArrowUpOnSquareIcon class="mt-2 size-6"/>
            </div>
          </div>
          <div>
            <span class="text-primary">{{ recipe.author }}</span>
            •
            <span>{{ formattedDate }}</span>
            •
            <span>{{ recipe.servingSize }}</span>
          </div>
      </div>
    </section>
    <div></div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { PencilSquareIcon, PlusIcon, TrashIcon, ArrowUpOnSquareIcon } from '@heroicons/vue/24/outline';
import { useRecipeStore } from '../../stores/recipeStore.js';

const store = useRecipeStore();
const route = useRoute();
const router = useRouter();

const sharedRecipe = ref(null);
const sharePermissions = ref({ canEdit: false, type: null });
const shareError = ref(null);
const shareLoading = ref(false);
const isShareRoute = computed(() => route.name === 'recipe-share-view');
const shareToken = computed(() => route.params.token);

const recipe = computed(() => (isShareRoute.value ? sharedRecipe.value : store.getRecipeById(route.params.id)));
const canEditRecipe = computed(() => !isShareRoute.value && (recipe.value?.canEdit !== false));
const tagInput = ref('');
const showTagInput = ref(false);
const showDeleteConfirm = ref(false);
const deleting = ref(false);

const servingSize = computed(() => {
  const quantity = recipe.value?.servingsQuantity?.toString?.().trim() || '';
  const unit = recipe.value?.servingsUnit?.toString?.().trim() || '';
  const combined = [quantity, unit].filter(Boolean).join(' ').trim();
  return combined || '';
});

const formattedDate = computed(() => {
  if (!recipe.value?.createdAt) return '';
  const date = new Date(recipe.value.createdAt);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
});

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
  // handle mixed numbers like "1 1/2"
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

const openDeleteDialog = () => {
  if (!canEditRecipe.value) return;
  showDeleteConfirm.value = true;
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
};

const confirmDelete = async () => {
  if (!recipe.value || !canEditRecipe.value) return;
  deleting.value = true;
  try {
    await store.deleteRecipe(recipe.value.id);
    router.push({ name: 'home' });
  } catch (error) {
    console.error(error);
  } finally {
    deleting.value = false;
    showDeleteConfirm.value = false;
  }
};

const editRecipe = () => {
  if (!recipe.value) return;
  if (isShareRoute.value && sharePermissions.value.canEdit) {
    router.push({ name: 'recipe-share-edit', params: { token: shareToken.value } });
    return;
  }
  if (!canEditRecipe.value) return;
  router.push({ name: 'recipe-edit', params: { id: recipe.value.id } });
};

const persistTags = async (tags) => {
  if (!canEditRecipe.value) return;
  if (!recipe.value) return;
  try {
    await store.saveRecipe({ ...recipe.value, tags });
  } catch (error) {
    console.error(error);
  }
};

const toggleTagInput = () => {
  if (!canEditRecipe.value) return;
  showTagInput.value = !showTagInput.value;
};

const closeTagInput = () => {
  showTagInput.value = false;
  tagInput.value = '';
};

const confirmTag = () => {
  if (!canEditRecipe.value) return;
  const value = tagInput.value.trim();
  if (!value || !recipe.value) {
    closeTagInput();
    return;
  }
  const tags = Array.from(new Set([...(recipe.value.tags || []), value]));
  tagInput.value = '';
  showTagInput.value = false;
  persistTags(tags);
};

const removeTag = (tag) => {
  if (!canEditRecipe.value) return;
  if (!recipe.value) return;
  const tags = (recipe.value.tags || []).filter((t) => t !== tag);
  persistTags(tags);
};

const loadSharedRecipe = async () => {
  if (!shareToken.value || !isShareRoute.value) return;
  shareLoading.value = true;
  shareError.value = null;
  try {
    const res = await fetch(`/api/share/${shareToken.value}`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to load shared recipe.');
    sharedRecipe.value = data.recipe;
    sharePermissions.value = data.permissions || { canEdit: false, type: null };
  } catch (error) {
    shareError.value = error.message || 'Unable to load shared recipe.';
  } finally {
    shareLoading.value = false;
  }
};

watch(
  () => shareToken.value,
  () => loadSharedRecipe(),
  { immediate: true }
);
</script>
