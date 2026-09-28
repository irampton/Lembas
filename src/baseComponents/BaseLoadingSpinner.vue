<template>
  <div class="flex items-center justify-center gap-3 text-light" role="status" :aria-label="label">
    <span :class="[sizeClasses[size], 'animate-spin rounded-full border-current/25 border-t-current text-accent']" aria-hidden="true" />
    <span v-if="showLabel" class="text-sm font-semibold">{{ label }}</span>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, default: 'Loading…' },
  showLabel: { type: Boolean, default: false },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value),
  },
});

const sizeClasses = {
  small: 'size-5 border-2',
  medium: 'size-8 border-[3px]',
  large: 'size-10 border-4',
};
</script>
