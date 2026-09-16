<template>
  <NavBar v-if="auth.state.user" @go-home="goHome" />
  <RouterView :key="$route.fullPath" />
</template>

<script setup>
import { onMounted, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import NavBar from './shared/NavBar.vue';
import { useAuthStore } from './stores/authStore';
import { useRecipeStore } from './stores/recipeStore';

const auth = useAuthStore();
const recipes = useRecipeStore();
const route = useRoute();
const router = useRouter();

const goHome = () => router.push({ name: 'home' });

watch(
  () => auth.state.user,
  (user) => {
    if (user) {
      recipes.loadRecipes();
      recipes.loadSharedRecipes();
    } else {
      recipes.reset();
    }
  },
  { immediate: true }
);

onMounted(async () => {
  await auth.ensureReady();
  if (!auth.state.user && !route.meta?.allowShare && !['login', 'signup'].includes(route.name)) {
    router.replace({ name: 'login', query: { redirect: route.fullPath } });
  }
});
</script>
