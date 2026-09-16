<template>
  <div class="fixed inset-x-0 bottom-0 top-[68px] z-20 bg-black/30" @click.self="$emit('close')">
    <aside class="h-full w-72 bg-white p-5 shadow-xl" aria-label="Sidebar">
      <slot />
    </aside>
  </div>
</template>

<script setup>
defineEmits(['close']);
</script>
