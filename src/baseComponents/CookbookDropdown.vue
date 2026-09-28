<template>
  <BaseDropdown
    :model-value="modelValue"
    :options="dropdownOptions"
    :disabled="disabled"
    color-style="transparent"
    trigger-class="bg-base-alt"
    :trigger-style="selectedCookbook ? pillStyle(selectedCookbook) : null"
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
  >
    <template #selected="{ option }">
      <span v-if="option" class="block max-w-48 truncate font-bold">
        {{ option.label }}
      </span>
      <span v-else class="text-light">Select a cookbook</span>
    </template>
    <template #option="{ option }">
      <span class="block w-full truncate rounded-full px-3 py-1 text-sm font-bold" :style="pillStyle(option.cookbook)">
        {{ option.label }}
      </span>
    </template>
  </BaseDropdown>
</template>

<script setup>
import { computed } from 'vue';
import BaseDropdown from './BaseDropdown.vue';

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  cookbooks: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
});

defineEmits(['update:modelValue', 'change']);

const dropdownOptions = computed(() => props.cookbooks.map((cookbook) => ({
  value: cookbook.id,
  label: cookbook.name,
  cookbook,
  key: cookbook.id,
})));
const selectedCookbook = computed(() => props.cookbooks.find(
  (cookbook) => String(cookbook.id) === String(props.modelValue),
));

const pillStyle = (cookbook) => {
  const color = cookbook?.color || '#1D6AA3';
  const normalized = color.replace('#', '');
  const hex = normalized.length === 3
    ? normalized.split('').map((character) => character.repeat(2)).join('')
    : normalized;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const lightColor = Number.isNaN(red) || (red * 299 + green * 587 + blue * 114) / 1000 > 160;
  return { backgroundColor: color, color: lightColor ? '#1F2937' : '#FFFFFF' };
};
</script>
