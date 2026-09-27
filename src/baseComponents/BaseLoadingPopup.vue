<template>
  <BasePopup :aria-label="label" :closable="false">
    <div class="flex flex-col items-center gap-4 py-6" role="status">
      <div class="size-10 animate-spin rounded-full border-4 border-accent/25 border-t-accent" aria-hidden="true" />
      <p class="font-semibold text-base-dark">{{ label }}</p>
    </div>
  </BasePopup>
</template>

<script setup>
import BasePopup from './BasePopup.vue';

defineProps({
  label: {
    type: String,
    default: 'Loading…',
  },
});
</script>
