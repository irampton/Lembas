<template>
  <aside class="border-b border-slate-200 bg-white/90 backdrop-blur md:border-b-0 md:border-r">
    <div class="flex flex-col gap-4 px-4 py-4">
      <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Recipes</span>
        <span class="text-slate-400">{{ recipes.length }}</span>
      </div>

      <div v-if="loading" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Loading recipes...
      </div>
      <div
        v-else-if="!recipes.length"
        class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
      >
        No recipes yet. Tap the + to create one.
      </div>

      <ul class="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm">
        <li v-for="recipe in recipes" :key="recipe.id">
          <RouterLink
            :to="{ name: 'recipe-detail', params: { id: recipe.id } }"
            class="flex items-center gap-2 px-3 py-3 text-sm transition hover:bg-orange-50"
            :class="{ 'bg-orange-50 text-orange-800 font-semibold': activeId === recipe.id }"
          >
            <span class="truncate whitespace-nowrap">{{ recipe.title }}</span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup>
import { RouterLink } from 'vue-router';

defineProps({
  recipes: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  activeId: {
    type: String,
    default: null,
  },
});

defineEmits(['go-home']);
</script>
