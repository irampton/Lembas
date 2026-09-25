<template>
  <section class="mx-auto w-full max-w-5xl p-4 md:p-6" aria-label="All recipes">
    <div class="mb-4 flex items-center justify-between gap-3">
      <button type="button" class="rounded p-2 text-accent hover:bg-base-alt" :aria-expanded="showFilters" aria-controls="recipe-filters" aria-label="Filter recipes" @click="showFilters = !showFilters"><FunnelIcon class="size-5" aria-hidden="true" /></button>
      <div class="flex items-center text-base-dark">
        <select id="recipe-sort" v-model="sortBy" aria-label="Sort recipes by" class="appearance-none rounded-none border-0 border-b border-accent bg-transparent px-2 py-1 focus:border-primary focus:outline-none">
          <option value="createdAt">Date added</option><option value="title">Name</option>
        </select>
        <button type="button" class="rounded p-2 hover:bg-base-alt" :aria-label="`Sort ${descending ? 'ascending' : 'descending'}`" :title="descending ? 'Descending order' : 'Ascending order'" @click="descending = !descending">
          <svg class="h-5 w-4 text-accent" viewBox="0 0 16 20" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 2 13 7H3Z" :fill="descending ? 'none' : 'currentColor'" />
            <path d="m8 18 5-5H3Z" :fill="descending ? 'currentColor' : 'none'" />
          </svg>
        </button>
      </div>
    </div>
    <div v-show="showFilters" id="recipe-filters" class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by cookbook">
      <button
        v-for="cookbook in cookbooks"
        :key="cookbook.id"
        type="button"
        class="flex max-w-full items-center gap-1 rounded-full border border-accent-alt px-3 py-1 font-bold text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="isCookbookSelected(cookbook.id) ? 'bg-accent text-base-alt' : 'text-base-dark bg-base-alt'"
        :aria-pressed="isCookbookSelected(cookbook.id)"
        @click="toggleCookbook(cookbook.id)"
      >
        <span class="truncate">{{ cookbook.name }}</span>
      </button>
      <p v-if="!cookbooks.length" class="text-sm text-light">No cookbooks available.</p>
    </div>
    <p v-if="store.state.error" role="alert" class="mb-3 text-red-700">{{ store.state.error }} <button type="button" class="underline" @click="store.loadLibrary()">Retry</button></p>
    <p v-if="store.state.loading && !store.state.ready" role="status">Loading recipes…</p>
    <ul v-else-if="recipes.length" class="divide-y divide-base-dark">
      <li v-for="recipe in recipes" :key="recipe.id">
        <RecipeCard :recipe-id="recipe.id" :recipe-name="recipe.title" :ingredient-list="recipe.ingredients" :tags="recipe.tags" />
      </li>
    </ul>
    <p v-else-if="!store.state.error" role="status">{{ store.state.recipes.length ? 'No recipes match your filters.' : 'No recipes yet.' }} <RouterLink v-if="!store.state.recipes.length" :to="{ name: 'recipe-new' }" class="text-primary underline">Create a recipe</RouterLink></p>
  </section>
</template>
<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { CheckIcon, FunnelIcon } from '@heroicons/vue/24/outline';
import { useRecipeStore } from '../../stores/recipeStore.js';
import RecipeCard from './RecipeCard.vue';
const store = useRecipeStore();
const sortBy = ref('createdAt');
const descending = ref(true);
const showFilters = ref(false);
const cookbooks = computed(() => [...new Map([...store.state.cookbooks, ...store.state.sharedCookbooks].map((book) => [book.id, book])).values()]);
const isCookbookSelected = (id) => !store.state.excludedCookbookIds.includes(id);
const toggleCookbook = (id) => {
  store.state.excludedCookbookIds = isCookbookSelected(id)
    ? [...store.state.excludedCookbookIds, id]
    : store.state.excludedCookbookIds.filter((excludedId) => excludedId !== id);
};
const compareNames = (a, b) => String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base', numeric: true });
const dateValue = (recipe) => Date.parse(recipe.createdAt) || 0;
const recipes = computed(() => {
  const query = store.state.searchQuery.trim().toLocaleLowerCase();
  return store.state.recipes.filter((recipe) => {
    if (!isCookbookSelected(recipe.cookbookId)) return false;
    const searchable = [recipe.title, ...(recipe.ingredients || []).map((item) => typeof item === 'string' ? item : item.name), ...(recipe.tags || []).map((tag) => typeof tag === 'string' ? tag : tag.name)];
    return !query || searchable.join(' ').toLocaleLowerCase().includes(query);
  }).sort((a, b) => {
    const comparison = sortBy.value === 'createdAt' ? dateValue(a) - dateValue(b) : compareNames(a.title, b.title);
    return comparison * (descending.value ? -1 : 1) || compareNames(a.title, b.title) || compareNames(a.id, b.id);
  });
});
</script>
