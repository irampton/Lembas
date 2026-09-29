<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 lg:p-6 lg:flex-row lg:items-start">
    <SettingsSidebar />

    <section class="min-w-0 flex-1" aria-labelledby="profile-title">
      <h1 id="profile-title" class="mb-6 text-3xl font-bold text-base-dark lg:text-4xl">Profile</h1>
      <article class="flex items-center gap-5 rounded-2xl bg-base-alt p-5 drop-shadow-lg lg:p-8">
        <UserCircleIcon class="size-20 shrink-0 text-primary lg:size-24" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-3xl font-bold text-base-dark lg:text-4xl">
            {{ auth.state.user?.displayName || auth.state.user?.username }}
          </p>
          <p class="mt-1 truncate text-sm font-semibold lowercase tracking-widest text-light">
            {{ auth.state.user?.username }}
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-full p-2 text-accent hover:bg-white hover:text-accent-alt"
          aria-label="Edit profile"
          @click="openEditor"
        >
          <PencilSquareIcon class="size-6" aria-hidden="true" />
        </button>
      </article>

      <BasePopup
        v-if="editorOpen"
        aria-label="Edit profile"
        :buttons="['cancel', 'confirm']"
        :confirm-disabled="saving"
        :confirm-label="saving ? 'Saving…' : 'Save'"
        @close="editorOpen = false"
        @confirm="saveProfile"
      >
        <h2 class="mb-5 text-2xl font-bold text-base-dark">Edit profile</h2>
        <form class="space-y-4" @submit.prevent="saveProfile">
          <div>
            <label for="display-name" class="mb-1 block font-bold text-base-dark">Display name</label>
            <BaseTextInput id="display-name" v-model="form.displayName" autocomplete="name" />
            <p class="mt-1 text-xs text-light">Up to 24 characters. Unicode is supported.</p>
          </div>
          <div>
            <label for="profile-username" class="mb-1 block font-bold text-base-dark">Username</label>
            <BaseTextInput
              id="profile-username"
              v-model="form.username"
              autocomplete="username"
              maxlength="24"
              class="lowercase"
              @update:model-value="normalizeUsername"
            />
            <p class="mt-1 text-xs text-light">Up to 24 ASCII characters with no spaces. Usernames are lowercase and unique.</p>
          </div>
          <p v-if="error" role="alert" class="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">{{ error }}</p>
        </form>
      </BasePopup>
    </section>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { PencilSquareIcon, UserCircleIcon } from '@heroicons/vue/24/outline';
import BasePopup from '../../baseComponents/BasePopup.vue';
import BaseTextInput from '../../baseComponents/BaseTextInput.vue';
import SettingsSidebar from '../../shared/SettingsSidebar.vue';
import { useAuthStore } from '../../stores/authStore.js';

const auth = useAuthStore();
const editorOpen = ref(false);
const saving = ref(false);
const error = ref('');
const form = reactive({ displayName: '', username: '' });

const openEditor = () => {
  form.displayName = auth.state.user?.displayName || auth.state.user?.username || '';
  form.username = auth.state.user?.username || '';
  error.value = '';
  editorOpen.value = true;
};

const normalizeUsername = (value) => {
  form.username = value.toLowerCase();
};

const saveProfile = async () => {
  if (saving.value) return;
  error.value = '';
  const displayName = form.displayName.trim();
  if (!displayName || Array.from(displayName).length > 24) {
    error.value = 'Display name must be between 1 and 24 characters.';
    return;
  }
  saving.value = true;
  try {
    await auth.updateProfile({ displayName, username: form.username });
    editorOpen.value = false;
  } catch (err) {
    error.value = err.message || 'Unable to update profile.';
  } finally {
    saving.value = false;
  }
};
</script>
