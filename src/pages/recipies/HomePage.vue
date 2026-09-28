<template>
  <section class="mx-auto w-full max-w-5xl p-4 md:p-6" aria-label="All recipes">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex items-center">
        <button type="button" class="rounded p-2 text-accent hover:bg-base-alt" :aria-expanded="activeFilter === 'cookbooks'" aria-controls="cookbook-filters" aria-label="Filter recipes by cookbook" @click="toggleFilter('cookbooks')">
          <BookOpenSolidIcon v-if="hasCookbookFilter" class="size-5" aria-hidden="true" />
          <BookOpenIcon v-else class="size-5" aria-hidden="true" />
        </button>
        <button type="button" class="rounded p-2 text-accent hover:bg-base-alt" :aria-expanded="activeFilter === 'tags'" aria-controls="tag-filters" aria-label="Filter recipes by tag" @click="toggleFilter('tags')">
          <TagSolidIcon v-if="hasTagFilter" class="size-5" aria-hidden="true" />
          <TagIcon v-else class="size-5" aria-hidden="true" />
        </button>
      </div>
      <div class="flex items-center text-base-dark">
        <BaseDropdown id="recipe-sort" v-model="sortBy" color-style="transparent" aria-label="Sort recipes by">
          <option value="createdAt">Date added</option><option value="title">Name</option>
        </BaseDropdown>
        <button type="button" class="rounded p-2 hover:bg-base-alt" :aria-label="`Sort ${descending ? 'ascending' : 'descending'}`" :title="descending ? 'Descending order' : 'Ascending order'" @click="descending = !descending">
          <svg class="h-5 w-4 text-accent" viewBox="0 0 16 20" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 2 13 7H3Z" :fill="descending ? 'none' : 'currentColor'" />
            <path d="m8 18 5-5H3Z" :fill="descending ? 'currentColor' : 'none'" />
          </svg>
        </button>
      </div>
    </div>
    <div v-show="activeFilter === 'cookbooks'" id="cookbook-filters" class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by cookbook">
      <button
        v-for="cookbook in cookbooks"
        :key="cookbook.id"
        type="button"
        class="flex max-w-full items-center gap-1 rounded-full drop-shadow-md px-3 py-1 font-bold text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="isCookbookSelected(cookbook.id) ? 'opacity-100' : 'opacity-50'"
        :style="cookbookStyle(cookbook)"
        :aria-pressed="isCookbookSelected(cookbook.id)"
        @click="toggleCookbook(cookbook.id)"
      >
        <span class="truncate">{{ cookbook.name }}</span>
      </button>
      <p v-if="!cookbooks.length" class="text-sm text-light">No cookbooks available.</p>
    </div>
    <div v-show="activeFilter === 'tags'" id="tag-filters" class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
      <button
        v-for="tag in tags"
        :key="tag"
        type="button"
        class="max-w-full rounded-full bg-primary px-3 py-1 text-sm font-bold text-white drop-shadow-md transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="isTagSelected(tag) ? 'opacity-100' : 'opacity-50'"
        :aria-pressed="isTagSelected(tag)"
        @click="toggleTag(tag)"
      >
        <span class="truncate">{{ tag }}</span>
      </button>
      <p v-if="!tags.length" class="text-sm text-light">No tags available.</p>
    </div>
    <p v-if="store.state.error" role="alert" class="mb-3 text-red-700">{{ store.state.error }} <button type="button" class="underline" @click="store.loadLibrary()">Retry</button></p>
    <p v-if="store.state.loading && !store.state.ready" class="text-center text-light italic" role="status">
      Loading recipes…
    </p>
    <ul v-else-if="recipes.length">
      <li v-for="recipe in recipes" :key="recipe.id" class="my-2">
        <RecipeCard :recipe-id="recipe.id" :recipe-name="recipe.title" :ingredient-list="recipe.ingredients" :tags="recipe.tags" :cookbook="cookbookById.get(recipe.cookbookId)" />
      </li>
    </ul>
    <p v-else-if="!store.state.error" class="text-center text-light italic" role="status">
      {{ store.state.recipes.length ? 'No recipes match your filters' : 'No recipes yet' }}
    </p>
  </section>
</template>
<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { BookOpenIcon, TagIcon } from '@heroicons/vue/24/outline';
import { BookOpenIcon as BookOpenSolidIcon, TagIcon as TagSolidIcon } from '@heroicons/vue/24/solid';
import BaseDropdown from '../../baseComponents/BaseDropdown.vue';
import { useRecipeStore } from '../../stores/recipeStore.js';
import RecipeCard from './RecipeCard.vue';
const store = useRecipeStore();
const sortBy = ref('createdAt');
const descending = ref(true);
const activeFilter = ref(null);
const excludedTags = ref([]);
const toggleFilter = (filter) => {
  activeFilter.value = activeFilter.value === filter ? null : filter;
};
const cookbookStyle = (cookbook) => {
  const color = cookbook.color || '#1D6AA3';
  const hex = color.replace('#', '');
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const lightColor = Number.isNaN(red) || (red * 299 + green * 587 + blue * 114) / 1000 > 160;
  return { backgroundColor: color, color: lightColor ? '#1F2937' : '#FFFFFF' };
};
const cookbooks = computed(() => [...new Map([...store.state.cookbooks, ...store.state.sharedCookbooks].map((book) => [book.id, book])).values()]);
const cookbookById = computed(() => new Map(cookbooks.value.map((cookbook) => [cookbook.id, cookbook])));
const hasCookbookFilter = computed(() => store.state.excludedCookbookIds.length > 0);
const isCookbookSelected = (id) => !store.state.excludedCookbookIds.includes(id);
const toggleCookbook = (id) => {
  store.state.excludedCookbookIds = isCookbookSelected(id)
    ? [...store.state.excludedCookbookIds, id]
    : store.state.excludedCookbookIds.filter((excludedId) => excludedId !== id);
};
const tagName = (tag) => String(typeof tag === 'string' ? tag : tag?.name || '').trim();
const tags = computed(() => [...new Set(store.state.recipes.flatMap((recipe) => (recipe.tags || []).map(tagName)).filter(Boolean))]
  .sort((a, b) => compareNames(a, b)));
const hasTagFilter = computed(() => excludedTags.value.length > 0);
const isTagSelected = (tag) => !excludedTags.value.includes(tag);
const toggleTag = (tag) => {
  if (!hasTagFilter.value) {
    excludedTags.value = tags.value.filter((candidate) => candidate !== tag);
    return;
  }
  excludedTags.value = isTagSelected(tag)
    ? [...excludedTags.value, tag]
    : excludedTags.value.filter((excludedTag) => excludedTag !== tag);
};
const visibleCookbooks = computed(() => cookbooks.value.filter((cookbook) => isCookbookSelected(cookbook.id)));
const newRecipeRoute = computed(() => ({
  name: 'recipe-new',
  ...(visibleCookbooks.value.length ? { query: { cookbookId: visibleCookbooks.value[0].id } } : {}),
}));
const compareNames = (a, b) => String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base', numeric: true });
const dateValue = (recipe) => Date.parse(recipe.createdAt) || 0;
const recipes = computed(() => {
  const query = store.state.searchQuery.trim().toLocaleLowerCase();
  return store.state.recipes.filter((recipe) => {
    if (!isCookbookSelected(recipe.cookbookId)) return false;
    if ((recipe.tags || []).some((tag) => isTagSelected(tagName(tag))) === false && hasTagFilter.value) return false;
    const searchable = [recipe.title, ...(recipe.ingredients || []).map((item) => typeof item === 'string' ? item : item.name), ...(recipe.tags || []).map((tag) => typeof tag === 'string' ? tag : tag.name)];
    return !query || searchable.join(' ').toLocaleLowerCase().includes(query);
  }).sort((a, b) => {
    const comparison = sortBy.value === 'createdAt' ? dateValue(a) - dateValue(b) : compareNames(a.title, b.title);
    return comparison * (descending.value ? -1 : 1) || compareNames(a.title, b.title) || compareNames(a.id, b.id);
  });
});
</script>
