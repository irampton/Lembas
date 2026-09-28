<template>
  <div v-if="isPublicMinimalRoute && !auth.state.user" class="sticky top-0 z-100 flex w-full items-center justify-between bg-primary p-4">
    <RouterLink
      :to="auth.state.user ? { name: 'home' } : { name: 'login', query: { redirect: route.fullPath } }"
      aria-label="Recipeas home"
    >
      <img src="/assets/banner.svg" alt="Recipeas" class="h-8 w-auto">
    </RouterLink>
    <RouterLink
      v-if="!auth.state.user"
      :to="{ name: 'login', query: { redirect: route.fullPath } }"
      class="rounded-lg px-3 py-1.5 font-semibold text-white hover:bg-white/15"
    >
      Log in
    </RouterLink>
  </div>
  <div v-else class="w-full flex flex-row items-center justify-between sticky top-0 bg-primary p-4 z-100">
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
      <button type="button" class="cursor-pointer" aria-label="Go to home" @click="$emit('go-home')">
        <img src="/assets/banner.svg" alt="Recipeas" class="h-8 w-auto">
      </button>
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
      <button
        type="button"
        class="text-white"
        aria-label="Add"
        :aria-expanded="addMenuOpen"
        @click.stop="toggleAddMenu"
      >
        <PlusIcon class="size-6" />
      </button>
      <BaseFloatingBox
        v-if="addMenuOpen"
        class="absolute right-8 top-full z-10 mt-3 min-w-48 text-left"
        @clickaway="addMenuOpen = false"
      >
        <RouterLink
          :to="newRecipeRoute"
          class="flex items-center gap-2 font-semibold text-accent hover:text-accent-alt"
          @click="addMenuOpen = false"
        >
          <PlusIcon class="size-5 shrink-0" aria-hidden="true" />
          New Recipe
        </RouterLink>
        <RouterLink
          v-if="llmAvailable"
          :to="importRecipeRoute"
          class="mt-2 flex items-center gap-2 font-semibold text-accent hover:text-accent-alt"
          @click="addMenuOpen = false"
        >
          <ArrowRightEndOnRectangleIcon class="size-5 shrink-0" aria-hidden="true" />
          Import Recipe
        </RouterLink>
        <button
          type="button"
          class="mt-2 flex w-full items-center gap-2 border-t border-primary-alt pt-2 text-left font-semibold text-accent hover:text-accent-alt"
          @click="openNewCookbook"
        >
          <PlusIcon class="size-5 shrink-0" aria-hidden="true" />
          Cookbook
        </button>
      </BaseFloatingBox>
      <button
        type="button"
        class="text-white"
        aria-label="Open profile menu"
        :aria-expanded="profileMenuOpen"
        @click.stop="toggleProfileMenu"
      >
        <UserIcon class="size-6" />
      </button>
      <BaseFloatingBox
        v-if="profileMenuOpen"
        class="absolute right-0 top-full z-10 mt-3 min-w-44 text-left"
        @clickaway="profileMenuOpen = false"
      >
        <RouterLink
          :to="{ name: 'settings-profile' }"
          class="flex items-center gap-2 border-b border-primary-alt pb-2 font-semibold text-gray-800 hover:text-accent"
          @click="profileMenuOpen = false"
        >
          <UserCircleIcon class="size-5 shrink-0" aria-hidden="true" />
          {{ auth.state.user?.displayName || auth.state.user?.username }}
        </RouterLink>
        <RouterLink :to="{ name: 'settings-friends' }" class="mt-2 flex items-center gap-2 text-accent hover:text-accent-alt">
          <UserGroupIcon class="size-5 shrink-0" aria-hidden="true" />
          Friends
        </RouterLink>
        <RouterLink
          v-if="auth.canManageUsers()"
          :to="{ name: 'admin-users' }"
          class="mt-2 flex items-center gap-2 text-accent hover:text-accent-alt"
          @click="profileMenuOpen = false"
        >
          <UsersIcon class="size-5 shrink-0" aria-hidden="true" />
          Admin
        </RouterLink>
        <button
          type="button"
          class="mt-2 flex w-full items-center gap-2 border-t border-primary-alt pt-2 text-left text-accent hover:text-accent-alt"
          @click="logOut"
        >
          <ArrowRightStartOnRectangleIcon class="size-5 shrink-0" aria-hidden="true" />
          Log out
        </button>
      </BaseFloatingBox>
    </div>
    <Transition name="sidebar">
      <BaseSidebar v-if="sidebarOpen" @close="sidebarOpen = false">
        <div class="flex justify-center">
          <BaseButton colorType="action" @click="openNewRecipe">New Recipe</BaseButton>
        </div>
        <div class="mt-6 flex items-center justify-between px-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          <span>Cookbooks</span>
          <button type="button" class="text-accent" aria-label="Add cookbook" @click="editCookbook = {}">
            <PlusIcon class="size-5" />
          </button>
        </div>
        <nav class="mt-2" aria-label="Cookbooks">
          <div
            v-for="cookbook in recipes.state.cookbooks"
            :key="cookbook.id"
            draggable="true"
            class="mb-2 flex w-full items-center rounded-2xl drop-shadow-lg"
            :class="draggedCookbookId === cookbook.id ? 'opacity-50' : ''"
            :style="cookbookStyle(cookbook)"
            @dragstart="startCookbookDrag(cookbook.id, $event)"
            @dragend="endCookbookDrag"
            @dragover.prevent
            @dragenter.prevent="previewCookbookOrder(cookbook.id)"
            @drop.prevent="dropCookbook"
          >
            <button type="button" class="min-w-0 grow truncate px-3 py-2 text-left font-semibold" @click="openCookbook(cookbook.id)">
              {{ cookbook.name }}
            </button>
            <button type="button" class="shrink-0 rounded-full p-2 hover:bg-black/10" :aria-label="`Edit ${cookbook.name}`" @click="editCookbook = cookbook">
              <Cog6ToothIcon class="size-5" />
            </button>
          </div>
          <p v-if="recipes.state.ready && !recipes.state.cookbooks.length" class="px-3 py-2 text-sm text-light">
            No cookbooks yet.
          </p>
          <template v-if="recipes.state.sharedCookbooks.length">
            <p class="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Shared with you</p>
            <div v-for="cookbook in recipes.state.sharedCookbooks" :key="cookbook.id" class="mb-2 mt-2 flex w-full items-center rounded-2xl drop-shadow-lg" :style="cookbookStyle(cookbook)">
              <button type="button" class="min-w-0 grow truncate px-3 py-2 text-left font-semibold" @click="openCookbook(cookbook.id)">{{ cookbook.name }}</button>
              <button v-if="cookbook.accessLevel === 'cookbook'" type="button" class="shrink-0 rounded-full p-2 hover:bg-black/10" :aria-label="`Edit ${cookbook.name}`" @click="editCookbook = cookbook">
                <Cog6ToothIcon class="size-5" />
              </button>
            </div>
          </template>
        </nav>
      </BaseSidebar>
    </Transition>
    <CookbookPopup v-if="editCookbook" :cookbook="editCookbook.id ? editCookbook : null" @close="editCookbook = null" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  ArrowRightEndOnRectangleIcon,
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UsersIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/vue/24/outline';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import BaseButton from '../baseComponents/BaseButton.vue';
import BaseFloatingBox from '../baseComponents/BaseFloatingBox.vue';
import BaseSidebar from '../baseComponents/BaseSidebar.vue';
import CookbookPopup from './CookbookPopup.vue';
import { useAuthStore } from '../stores/authStore';
import { useRecipeStore } from '../stores/recipeStore';
import { useSettingsStore } from '../stores/settingsStore';

const auth = useAuthStore();
const recipes = useRecipeStore();
const settings = useSettingsStore();
const router = useRouter();
const route = useRoute();
const isPublicMinimalRoute = computed(() =>
  ['recipe-share-view', 'recipe-not-found'].includes(route.name),
);
const addMenuOpen = ref(false);
const profileMenuOpen = ref(false);
const sidebarOpen = ref(false);
const editCookbook = ref(null);
const draggedCookbookId = ref(null);
const cookbookOrderBeforeDrag = ref([]);
const cookbookWasDropped = ref(false);

const startCookbookDrag = (cookbookId, event) => {
  draggedCookbookId.value = cookbookId;
  cookbookOrderBeforeDrag.value = [...recipes.state.cookbooks];
  cookbookWasDropped.value = false;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', cookbookId);
};

const previewCookbookOrder = (targetId) => {
  const draggedId = draggedCookbookId.value;
  if (!draggedId || draggedId === targetId) return;
  const cookbooks = [...recipes.state.cookbooks];
  const fromIndex = cookbooks.findIndex((cookbook) => cookbook.id === draggedId);
  const targetIndex = cookbooks.findIndex((cookbook) => cookbook.id === targetId);
  if (fromIndex < 0 || targetIndex < 0) return;
  const [draggedCookbook] = cookbooks.splice(fromIndex, 1);
  cookbooks.splice(targetIndex, 0, draggedCookbook);
  recipes.state.cookbooks = cookbooks;
};

const dropCookbook = async () => {
  if (!draggedCookbookId.value) return;
  cookbookWasDropped.value = true;
  const cookbookIds = recipes.state.cookbooks.map((cookbook) => cookbook.id);
  try {
    await recipes.reorderCookbooks(cookbookIds);
  } catch (error) {
    recipes.state.cookbooks = cookbookOrderBeforeDrag.value;
    console.error(error);
  } finally {
    draggedCookbookId.value = null;
    cookbookOrderBeforeDrag.value = [];
    cookbookWasDropped.value = false;
  }
};

const endCookbookDrag = () => {
  if (cookbookWasDropped.value) return;
  if (cookbookOrderBeforeDrag.value.length) {
    recipes.state.cookbooks = cookbookOrderBeforeDrag.value;
  }
  draggedCookbookId.value = null;
  cookbookOrderBeforeDrag.value = [];
  cookbookWasDropped.value = false;
};

const cookbookStyle = (cookbook) => {
  const color = cookbook.color || '#1D6AA3';
  const hex = color.replace('#', '');
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const lightColor = Number.isNaN(red) || (red * 299 + green * 587 + blue * 114) / 1000 > 160;
  return { backgroundColor: color, color: lightColor ? '#1F2937' : '#FFFFFF' };
};

const allCookbooks = computed(() => [
  ...new Map(
    [...recipes.state.cookbooks, ...recipes.state.sharedCookbooks].map((cookbook) => [cookbook.id, cookbook]),
  ).values(),
]);

const defaultCookbookId = computed(() => {
  const canAddRecipes = (cookbook) => cookbook && (
    recipes.state.cookbooks.some((owned) => owned.id === cookbook.id) || cookbook.accessLevel === 'cookbook'
  );
  if (route.name === 'recipe-detail') {
    const cookbookId = recipes.getRecipeById(route.params.id)?.cookbookId || '';
    if (canAddRecipes(recipes.getCookbookById(cookbookId))) return cookbookId;
  }

  if (route.name === 'home') {
    const visibleCookbooks = allCookbooks.value.filter(
      (cookbook) => !recipes.state.excludedCookbookIds.includes(cookbook.id),
    );
    return visibleCookbooks.find(canAddRecipes)?.id || recipes.state.cookbooks[0]?.id || '';
  }

  return recipes.state.cookbooks[0]?.id || '';
});

const newRecipeRoute = computed(() => ({
  name: 'recipe-new',
  ...(defaultCookbookId.value ? { query: { cookbookId: defaultCookbookId.value } } : {}),
}));

const importRecipeRoute = computed(() => ({
  name: 'recipe-import',
  ...(defaultCookbookId.value ? { query: { cookbookId: defaultCookbookId.value } } : {}),
}));

const llmAvailable = computed(() => settings.isLlmEnabled());

const toggleAddMenu = () => {
  addMenuOpen.value = !addMenuOpen.value;
  profileMenuOpen.value = false;
};

const toggleProfileMenu = () => {
  profileMenuOpen.value = !profileMenuOpen.value;
  addMenuOpen.value = false;
};

const openNewCookbook = () => {
  addMenuOpen.value = false;
  editCookbook.value = {};
};

const showSearchResults = () => {
  if (route.name !== 'home') router.push({ name: 'home' });
};

const openNewRecipe = () => {
  sidebarOpen.value = false;
  router.push(newRecipeRoute.value);
};

const openCookbook = (cookbookId) => {
  recipes.state.excludedCookbookIds = allCookbooks.value
    .filter((cookbook) => cookbook.id !== cookbookId)
    .map((cookbook) => cookbook.id);
  sidebarOpen.value = false;
  router.push({ name: 'home' });
};

const logOut = async () => {
  profileMenuOpen.value = false;
  await auth.logout();
  router.push({ name: 'login' });
};

onMounted(() => {
  settings.loadSettings().catch((error) => console.error(error));
});

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
