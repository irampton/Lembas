<template>
  <section>
    <div
      v-if="!isShareRoute && store.state.loading && !store.state.ready"
    >
      Loading recipe…
    </div>

    <div v-else-if="isShareRoute && shareLoading">
      <p>Loading shared recipe…</p>
    </div>

    <div
      v-else-if="!recipe && !isShareRoute"
    >
      <p>Recipe not found</p>
      <p>It might have been removed or not saved yet. Create a new one to get started.</p>
      <div>
        <RouterLink
          :to="{ name: 'recipe-new' }"
        >
          <PlusIcon />
          Create recipe
        </RouterLink>
        <RouterLink
          :to="{ name: 'home' }"
        >
          Go home
        </RouterLink>
      </div>
    </div>

    <div v-else-if="shareError">
      <p>Unable to load shared recipe</p>
      <p>{{ shareError }}</p>
    </div>

    <div v-else>
      <div>
        <div>
          <h1>{{ recipe.title }}</h1>
          <p v-if="metaLine">{{ metaLine }}</p>
          <p v-if="recipe.description">{{ recipe.description }}</p>
          <div>
            <div>
              <span v-for="tag in recipe.tags" :key="`${recipe.id}-${tag}`">
                  <span>{{ tag }}</span>
                  <button
                    v-if="canEditRecipe"
                    type="button"
                    @click="removeTag(tag)"
                    title="Remove tag"
                  >
                    ×
                  </button>
              </span>
              <button
                v-if="canEditRecipe"
                type="button"
                title="Add tag"
                @click="toggleTagInput"
              >
                +
              </button>
              <span v-if="!recipe.tags?.length">No tags yet</span>
            </div>
            <div
              v-if="showTagInput"
            >
              <div>
                <div>
                  <input
                    v-model="tagInput"
                    type="text"
                    placeholder="Type a tag"
                    @keyup.enter="confirmTag"
                    autofocus
                  />
                  <div>
                    <button
                      type="button"
                      @click="confirmTag"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      @click="closeTagInput"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="canEditRecipe">
          <button
            type="button"
            @click="editRecipe"
            title="Edit recipe"
          >
            <PencilSquareIcon />
          </button>
          <button
            type="button"
            @click="openDeleteDialog"
            title="Delete recipe"
          >
            <TrashIcon />
          </button>
        </div>
        <RouterLink
          v-else-if="sharePermissions.canEdit"
          :to="{ name: 'recipe-share-edit', params: { token: route.params.token } }"
          title="Edit shared recipe"
        >
          <PencilSquareIcon />
        </RouterLink>
      </div>

      <div>
        <div>
          <div>
            <h2>Ingredients</h2>
          </div>
          <div>
            <ul>
              <li
                v-for="(item, idx) in recipe.ingredients"
                :key="item.id || idx"
              >
                <span>{{ item.quantity }}</span>
                <span
                  :title="item.unit"
                >
                  {{ formatUnit(item.unit, item.quantity) }}
                </span>
                <span :title="item.name">{{ item.name }}</span>
              </li>
              <li v-if="!recipe.ingredients?.length">No ingredients added yet.</li>
            </ul>
          </div>
        </div>

        <div>
          <div>
            <h2>Directions</h2>
          </div>
          <ol>
            <li
              v-for="(step, index) in recipe.steps"
              :key="`${recipe.id}-step-${index}`"
            >
              <div>
                <span>Step {{ index + 1 }}</span>
                <p>{{ step || 'No instructions yet.' }}</p>
              </div>
            </li>
            <li v-if="!recipe.steps?.length">No steps added yet.</li>
          </ol>
        </div>
      </div>

      <div>
        <div>
          <h2>Notes</h2>
        </div>
        <div>
          <p v-if="recipe.notes">{{ recipe.notes }}</p>
          <p v-else>No notes added yet.</p>
        </div>
      </div>

      <div v-if="showDeleteConfirm">
        <p>Delete this recipe?</p>
        <p>This cannot be undone.</p>
        <button type="button" @click="confirmDelete">Delete</button>
        <button type="button" @click="cancelDelete">Cancel</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline';
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

const metaLine = computed(() => {
  const parts = [];
  if (recipe.value?.author) parts.push(recipe.value.author);
  if (formattedDate.value) parts.push(formattedDate.value);
  if (servingSize.value) parts.push(`Serves ${servingSize.value}`);
  return parts.join(' - ');
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
