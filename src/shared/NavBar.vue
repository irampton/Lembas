<template>
  <div class="w-full flex flex-row items-center justify-between sticky top-0 bg-primary p-4">
    <div class="flex items-center gap-4">
      <button
        type="button"
        class="text-white"
        aria-label="Open menu"
        :aria-expanded="sidebarOpen"
        @click="sidebarOpen = !sidebarOpen"
      >
        <Bars3Icon class="size-6" />
      </button>
      <div class="cursor-pointer text-xl font-bold text-white" @click="$emit('go-home')">Lembas</div>
    </div>
    <div class="relative w-1/3 max-w-md">
      <MagnifyingGlassIcon class="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-gray-500" />
      <input
        v-model="recipes.state.searchQuery"
        type="search"
        class="w-full rounded-full border border-primary-alt bg-white py-2 pl-4 pr-10 text-sm text-gray-800 outline-none"
        aria-label="Search recipes"
        @input="showSearchResults"
      >
    </div>
    <div class="relative flex items-center gap-3 text-right">
      <RouterLink :to="{ name: 'recipe-new' }" class="text-white" aria-label="Add new recipe">
        <PlusIcon class="size-6" />
      </RouterLink>
      <button
        type="button"
        class="text-white"
        aria-label="Open profile menu"
        :aria-expanded="profileMenuOpen"
        @click.stop="profileMenuOpen = !profileMenuOpen"
      >
        <UserIcon class="size-6" />
      </button>
      <BaseFloatingBox
        v-if="profileMenuOpen"
        class="absolute right-0 top-full z-10 mt-3 min-w-44 text-left"
        @clickaway="profileMenuOpen = false"
      >
        <p class="border-b border-primary-alt pb-2 font-semibold text-gray-800">{{ auth.state.user?.username }}</p>
        <RouterLink :to="{ name: 'settings-friends' }" class="mt-2 block text-primary hover:text-primary-alt">
          Friends
        </RouterLink>
        <RouterLink
          v-if="auth.canManageUsers()"
          :to="{ name: 'admin-server-settings' }"
          class="mt-2 block text-primary hover:text-primary-alt"
        >
          Admin
        </RouterLink>
      </BaseFloatingBox>
    </div>
    <Transition name="sidebar">
      <BaseSidebar v-if="sidebarOpen" @close="sidebarOpen = false">
        <div class="flex justify-center">
          <BaseButton type="action" @click="openNewRecipe">New Recipe</BaseButton>
        </div>
        <div class="mt-6 flex items-center justify-between px-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          <span>Cookbooks</span>
          <button type="button" class="text-primary" aria-label="Add cookbook">
            <PlusIcon class="size-5" />
          </button>
        </div>
      </BaseSidebar>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Bars3Icon, MagnifyingGlassIcon, PlusIcon, UserIcon } from '@heroicons/vue/24/outline';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import BaseButton from '../baseComponents/BaseButton.vue';
import BaseFloatingBox from '../baseComponents/BaseFloatingBox.vue';
import BaseSidebar from '../baseComponents/BaseSidebar.vue';
import { useAuthStore } from '../stores/authStore';
import { useRecipeStore } from '../stores/recipeStore';

const auth = useAuthStore();
const recipes = useRecipeStore();
const router = useRouter();
const route = useRoute();
const profileMenuOpen = ref(false);
const sidebarOpen = ref(false);

const showSearchResults = () => {
  if (route.name !== 'home') router.push({ name: 'home' });
};

const openNewRecipe = () => {
  sidebarOpen.value = false;
  router.push({ name: 'recipe-new' });
};

defineEmits(['go-home']);
</script>

<style scoped>
.sidebar-enter-active,
.sidebar-leave-active {
  transition: opacity 200ms ease;
}

.sidebar-enter-active :deep(aside),
.sidebar-leave-active :deep(aside) {
  transition: transform 200ms ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  opacity: 0;
}

.sidebar-enter-from :deep(aside),
.sidebar-leave-to :deep(aside) {
  transform: translateX(-100%);
}
</style>
