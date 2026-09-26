<template>
  <component
    :is="editable ? 'button' : 'span'"
    :type="editable ? 'button' : undefined"
    :class="['base-tag', { 'base-tag--editable': editable }]"
    :style="{ backgroundColor: color }"
    :aria-label="editable ? removeLabel : undefined"
    @click="editable && $emit('remove')"
  >
    <span class="base-tag__label"><slot /></span>
  </component>
</template>
<script setup>
defineProps({
  color: { type: String, default: "var(--color-primary)" },
  editable: { type: Boolean, default: false },
  removeLabel: { type: String, default: "Remove tag" },
});

defineEmits(["remove"]);
</script>
<style scoped>
.base-tag {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  overflow: hidden;
  padding: 0.125rem 0.625rem;
  border-radius: 9999px;
  color: var(--color-base-alt);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-tag__label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.base-tag--editable {
  cursor: pointer;
}

.base-tag--editable:hover,
.base-tag--editable:focus-visible {
  filter: brightness(1.2);
  outline: none;
}
</style>
