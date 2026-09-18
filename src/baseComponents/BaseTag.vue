<template>
  <span class="base-tag" :style="{ backgroundColor: color }"><slot /></span>
</template>
<script setup>
defineProps({ color: { type: String, default: '#fed7aa' } });
</script>
<style scoped>
.base-tag {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  padding: 0.125rem 0.625rem;
  border-radius: 9999px;
  color: #1c1917;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
