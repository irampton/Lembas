<template>
  <aside class="w-full shrink-0 lg:w-60" aria-label="Settings navigation">
    <div class="rounded-2xl bg-base-alt p-3 drop-shadow-lg lg:sticky lg:top-[86px]">
      <RouterLink
        :to="{ name: 'settings-profile' }"
        class="group flex items-center gap-3 rounded-xl px-3 pb-3 pt-2"
        aria-label="Open profile"
      >
        <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <UserCircleIcon class="size-6" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <p class="truncate font-bold text-base-dark group-hover:text-accent">{{ auth.state.user?.displayName || auth.state.user?.username }}</p>
          <p class="text-xs capitalize text-light">{{ auth.state.user?.role || 'user' }}</p>
        </div>
      </RouterLink>

      <nav class="flex gap-2 overflow-x-auto border-t border-accent-alt/15 pt-3 lg:block lg:space-y-1" aria-label="Settings pages">
        <RouterLink
          v-for="item in standardItems"
          :key="item.route"
          :to="{ name: item.route }"
          class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors lg:w-full"
          :class="route.name === item.route ? 'bg-primary text-white shadow-sm' : 'text-base-dark hover:bg-white hover:text-accent'"
        >
          <component :is="item.icon" class="size-5 shrink-0" aria-hidden="true" />
          {{ item.label }}
        </RouterLink>
        <div
          v-if="adminItems.length"
          class="mx-1 h-8 shrink-0 border-l border-accent-alt/25 lg:mx-3 lg:my-2 lg:h-0 lg:border-l-0 lg:border-t"
          aria-hidden="true"
        ></div>
        <RouterLink
          v-for="item in adminItems"
          :key="item.route"
          :to="{ name: item.route }"
          class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors lg:w-full"
          :class="route.name === item.route ? 'bg-primary text-white shadow-sm' : 'text-base-dark hover:bg-white hover:text-accent'"
        >
          <component :is="item.icon" class="size-5 shrink-0" aria-hidden="true" />
          {{ item.label }}
        </RouterLink>
      </nav>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ServerStackIcon, UserCircleIcon, UserGroupIcon, UsersIcon } from '@heroicons/vue/24/outline';
import { useAuthStore } from '../stores/authStore.js';

const auth = useAuthStore();
const route = useRoute();

const standardItems = [
  { label: 'Friends', route: 'settings-friends', icon: UserGroupIcon },
];

const adminItems = computed(() => auth.canManageUsers() ? [
  { label: 'Users', route: 'admin-users', icon: UsersIcon },
  { label: 'LLM Settings', route: 'admin-server-settings', icon: ServerStackIcon },
] : []);
</script>
