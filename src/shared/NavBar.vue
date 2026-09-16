<template>
  <nav>
    <button type="button" @click="$emit('go-home')">Home</button>
    <RouterLink :to="{ name: 'recipe-new' }">New recipe</RouterLink>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router';
defineEmits(['go-home']);
</script>
