<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:flex-row lg:items-start">
    <SettingsSidebar />
    <section class="min-w-0 flex-1">
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
            <div class="text-accent text-md font-bold uppercase">Admin</div>
            <div class="text-3xl font-bold md:text-4xl">Server Settings</div>
        </div>
      </header>

      <div class="flex flex-col md:flex-row gap-4">
        <form class="rounded-2xl bg-base-alt p-5 drop-shadow-lg md:p-6 h-min grow" @submit.prevent="save">
          <div class="mb-6 flex items-start justify-between gap-5 border-b border-accent-alt/15 pb-6">
            <div>
              <h2 class="text-xl font-bold">Recipe Import via LLM</h2>
            </div>
            <label class="relative inline-flex shrink-0 cursor-pointer items-center"
              aria-label="Enable LLM recipe import"><input v-model="form.enabled" type="checkbox"
                class="peer sr-only" /><span
                class="h-7 w-12 rounded-full bg-gray-300 transition-colors after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"></span></label>
          </div>

          <label v-if="form.enabled" for="llm-endpoint" class="block"><span class="mb-1 block font-bold">LLM endpoint</span>
            <BaseTextInput id="llm-endpoint" v-model="form.endpoint" type="url"
              placeholder="https://your-llm-server/v1/chat/completions"
              :disabled="!form.enabled || status.loading || settingsStore.state.saving"
              class="disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400" /><span
              class="mt-2 block text-sm text-light">OpenAI/llama.cpp compatible endpoint</span>
          </label>

          <p v-if="status.error" role="alert" class="mt-5 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">{{
            status.error }}</p>
          <p v-if="status.saved" role="status"
            class="mt-5 flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
            <CheckCircleIcon class="size-5" />Changes saved.
          </p>

          <div class="mt-6 flex flex-wrap items-center gap-3">
            <BaseButton native-type="submit" :disabled="status.loading || settingsStore.state.saving"><span
                class="flex items-center gap-2">
                <CheckIcon v-if="!settingsStore.state.saving" class="size-5" />
                <ArrowPathIcon v-else class="size-5 animate-spin" />{{ settingsStore.state.saving ? 'Saving…' : 'Save changes' }}
              </span></BaseButton>
            <BaseButton colorType="cancelAlt" :disabled="status.loading || settingsStore.state.saving" @click="resetForm">
              Reset</BaseButton>
          </div>
        </form>

        <aside class="rounded-2xl bg-base-alt p-5 drop-shadow-lg md:p-6 h-min" aria-label="LLM import status">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold">Status</h2>
            </div><span class="rounded-full px-3 py-1 text-xs font-bold"
              :class="llmAvailable ? 'bg-primary/15 text-primary' : 'bg-gray-200 text-light'">{{ llmAvailable ?
                'Enabled' : 'Disabled' }}</span>
          </div>
        </aside>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive } from 'vue';
import { ArrowPathIcon, CheckCircleIcon, CheckIcon, InformationCircleIcon, SparklesIcon } from '@heroicons/vue/24/outline';
import BaseButton from '../../baseComponents/BaseButton.vue';
import BaseTextInput from '../../baseComponents/BaseTextInput.vue';
import SettingsSidebar from '../../shared/SettingsSidebar.vue';
import { useSettingsStore } from '../../stores/settingsStore';

const settingsStore = useSettingsStore();

const status = reactive({
  loading: true,
  saved: false,
  error: null,
});

const form = reactive({
  enabled: false,
  endpoint: '',
});

const llmSettings = computed(() => settingsStore.getLlmSettings());
const llmAvailable = computed(() => settingsStore.isLlmEnabled());

const syncForm = () => {
  form.enabled = Boolean(llmSettings.value.enabled);
  form.endpoint = llmSettings.value.endpoint || '';
};

const resetForm = () => {
  syncForm();
  status.saved = false;
  status.error = null;
};

const load = async () => {
  status.loading = true;
  status.error = null;
  try {
    await settingsStore.loadSettings(true);
    syncForm();
  } catch (error) {
    status.error = error?.message || 'Unable to load settings.';
  } finally {
    status.loading = false;
  }
};

const save = async () => {
  status.saved = false;
  status.error = null;
  try {
    await settingsStore.updateLlmSettings({ enabled: form.enabled, endpoint: form.endpoint });
    status.saved = true;
    syncForm();
  } catch (error) {
    status.error = error?.message || 'Unable to save settings.';
  }
};

onMounted(async () => {
  await load();
});
</script>
