<template>
  <button type="button" :class="buttonClasses">
    <slot />
  </button>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: {
    type: String,
    default: 'action',
    validator: (value) => ['action', 'next', 'save', 'cancel'].includes(value),
  },
});

const buttonClasses = computed(() => {
  const typeClasses = {
    action: 'bg-orange-200 text-white hover:bg-orange-300',
    next: 'bg-orange-700 text-white hover:bg-orange-800',
    save: 'bg-green-700 text-white hover:bg-green-800',
    cancel: 'bg-gray-300 text-black hover:bg-gray-400',
  };

  return ['rounded-full px-4 py-2 font-semibold transition-colors', typeClasses[props.type]];
});
</script>
