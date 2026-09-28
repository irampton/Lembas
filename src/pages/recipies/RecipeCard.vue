<template>
  <div
    class="flex cursor-pointer flex-col px-4 py-3 bg-base-alt text-base-dark hover:bg-white rounded-2xl drop-shadow-lg focus-visible:outline-2 "
    role="link"
    tabindex="0"
    @click="openRecipe"
    @keydown.enter.prevent="openRecipe"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 grow truncate text-lg font-bold" :title="recipeName">{{ recipeName }}</div>
      <span v-if="cookbook" class="max-w-48 shrink-0 truncate rounded-full px-3 py-1 text-sm font-bold" :style="cookbookStyle" :title="cookbook.name">
        {{ cookbook.name }}
      </span>
    </div>
    <div class="truncate ml-px text-sm text-light" :title="ingredientSummary">{{ ingredientSummary }}</div>
    <div class="truncate text-light mt-1 -ml-2">
      <BaseTag v-for="(tag, index) in normalizedTags" :key="`${tag.name}-${index}`" :color="tag.color" class="ml-1 align-middle">{{ tag.name }}</BaseTag>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import BaseTag from '../../baseComponents/BaseTag.vue';
const props = defineProps({
  recipeId: { type: [String, Number], required: true },
  recipeName: { type: String, default: '' },
  ingredientList: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
  cookbook: { type: Object, default: null },
});
const router = useRouter();
const openRecipe = () => router.push({ name: 'recipe-detail', params: { id: props.recipeId } });
// Handle decimal quantities, fractions, and mixed numbers such as "1 1/2".
const amount = (quantity) => String(quantity ?? '').trim().split(/\s+/).reduce((total, part) => {
  const [numerator, denominator] = part.split('/').map(Number);
  const value = denominator === undefined ? numerator : denominator ? numerator / denominator : 0;
  return total + (Number.isFinite(value) ? value : 0);
}, 0);
const ingredientSummary = computed(() => [...props.ingredientList]
  .sort((a, b) => amount(b.quantity) - amount(a.quantity))
  .map((item) => typeof item === 'string' ? item : item.name).filter(Boolean).join(', '));
const normalizedTags = computed(() => props.tags.map((tag) => typeof tag === 'string' ? { name: tag } : tag).filter((tag) => tag?.name));
const cookbookStyle = computed(() => {
  const color = props.cookbook?.color || '#1D6AA3';
  const hex = color.replace('#', '');
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const lightColor = Number.isNaN(red) || (red * 299 + green * 587 + blue * 114) / 1000 > 160;
  return { backgroundColor: color, color: lightColor ? '#1F2937' : '#FFFFFF' };
});
</script>
