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
    action: 'bg-accent text-white hover:bg-accent-alt',
    next: 'bg-primary text-white hover:bg-primary-alt',
    save: 'bg-primary text-white hover:bg-primary-alt',
    cancel: 'bg-light text-black hover:bg-base-dark-alt',
  };

  return ['rounded-full px-4 py-2 font-semibold transition-colors', typeClasses[props.type]];
});
</script>
