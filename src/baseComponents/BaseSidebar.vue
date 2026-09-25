<template>
  <div class="fixed inset-x-0 bottom-0 top-[70px] z-20" @click.self="$emit('close')">
    <aside class="h-full w-72 bg-base-alt p-5 shadow-xl" aria-label="Sidebar">
      <slot />
    </aside>
  </div>
</template>

<script setup>
defineEmits(['close']);
</script>
