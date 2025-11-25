<template>
  <aside class="border-b border-slate-200 bg-white/90 backdrop-blur md:border-b-0 md:border-r">
    <div class="flex flex-col gap-5 px-4 py-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.25em] text-orange-600">Admin</p>
          <p class="text-sm font-semibold text-slate-900">Control panel</p>
        </div>
        <RouterLink
          :to="{ name: 'home' }"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l9-8 9 8M5 10v10h4V14h6v6h4V10" />
          </svg>
          Recipes
        </RouterLink>
      </div>

      <ul class="space-y-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <li v-for="link in links" :key="link.name">
          <RouterLink
            :to="link.to"
            class="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-semibold transition"
            :class="{
              'border border-orange-200 bg-orange-50 text-orange-800 shadow-sm': route.name === link.to.name,
              'text-slate-700 hover:bg-slate-50': route.name !== link.to.name,
            }"
          >
            <div class="flex items-center gap-3">
              <component :is="link.icon" class="h-4 w-4" />
              <span>{{ link.label }}</span>
            </div>
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ link.badge || '' }}</span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const route = useRoute();

const UserIcon = {
  template:
    '<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M12 12a5 5 0 100-10 5 5 0 000 10z\"/><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M4.75 21a7.25 7.25 0 0114.5 0\"/></svg>',
};

const ServerIcon = {
  template:
    '<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"6\" rx=\"1.5\" ry=\"1.5\" stroke-width=\"1.5\"/><rect x=\"3\" y=\"14\" width=\"18\" height=\"6\" rx=\"1.5\" ry=\"1.5\" stroke-width=\"1.5\"/><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M7 7h.01M11 7h6M7 17h.01M11 17h6\"/></svg>',
};

const links = computed(() => [
  { name: 'admin-users', label: 'Users & access', to: { name: 'admin-users' }, icon: UserIcon },
  { name: 'admin-server-settings', label: 'Server settings', to: { name: 'admin-server-settings' }, icon: ServerIcon },
]);
</script>
