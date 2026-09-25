<template>
  <div ref="floatingBox" class="rounded-lg border border-primary-alt bg-white p-3 shadow-lg">
    <slot />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const emit = defineEmits(['clickaway']);
const floatingBox = ref(null);

const handleClickAway = (event) => {
  if (floatingBox.value && !floatingBox.value.contains(event.target)) {
    emit('clickaway');
  }
};

onMounted(() => document.addEventListener('click', handleClickAway));
onBeforeUnmount(() => document.removeEventListener('click', handleClickAway));
</script>
