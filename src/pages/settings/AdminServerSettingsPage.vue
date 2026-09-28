<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:flex-row lg:items-start">
    <SettingsSidebar />
    <section class="min-w-0 flex-1">
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
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
              aria-label="Enable LLM recipe import"><input v-model="form.enabled" type="checkbox" :disabled="!form.model && !form.enabled"
                class="peer sr-only" /><span
                class="h-7 w-12 rounded-full bg-gray-300 transition-colors after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-40 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"></span></label>
          </div>

          <div class="flex flex-col gap-4">
            <label for="llm-endpoint" class="block"><span class="mb-1 block font-bold">LLM endpoint</span>
              <BaseTextInput id="llm-endpoint" v-model="form.endpoint" type="url"
                placeholder="https://your-llm-server/v1/chat/completions"
                :disabled="status.loading || settingsStore.state.saving"
                class="disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400" />
            </label>

            <label for="llm-api-key" class="block"><span class="mb-1 block font-bold">API key</span>
              <BaseTextInput id="llm-api-key" v-model="form.apiKey" type="password"
                :placeholder="form.hasApiKey ? 'API key configured' : 'API key'"
                autocomplete="new-password"
                :disabled="status.loading || settingsStore.state.saving" />
            </label>

            <div class="flex flex-col gap-2">
              <label for="llm-model" class="font-bold">Model</label>
              <BaseDropdown id="llm-model" v-model="form.model" class="min-w-0" :disabled="modelStatus.loading" :placeholder="modelStatus.loading ? 'Loading models…' : 'Select model'" @change="onModelChange">
                <option value="">Select model</option>
                <option v-for="model in modelOptions" :key="model" :value="model">{{ model }}</option>
              </BaseDropdown>
            </div>

            <label class="flex items-center justify-between gap-4 font-bold">
              Vision capable
              <span class="relative inline-flex shrink-0 items-center">
                <input v-model="form.visionCapable" type="checkbox" class="peer sr-only" :disabled="!form.model" />
                <span class="h-7 w-12 rounded-full bg-gray-300 transition-colors after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-disabled:opacity-40"></span>
              </span>
            </label>
          </div>

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
            <BaseButton
              colorType="cancelAlt"
              :disabled="status.loading || settingsStore.state.saving || testStatus.testing || !form.endpoint.trim() || !form.model"
              @click="testEndpoint"
            >
              <span class="flex items-center gap-2">
                <ArrowPathIcon v-if="testStatus.testing" class="size-5 animate-spin" />
                <SignalIcon v-else class="size-5" />
                {{ testStatus.testing ? 'Testing…' : 'Test endpoint' }}
              </span>
            </BaseButton>
          </div>
        </form>

        <aside class="rounded-2xl bg-base-alt p-5 drop-shadow-lg md:p-6 h-min" aria-label="LLM import status">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold">Status</h2>
            </div><span class="rounded-full px-3 py-1 text-xs font-bold"
              :class="statusBadgeClass">{{ statusLabel }}</span>
          </div>
          <p class="mt-4 text-sm" :class="testStatus.error ? 'text-error' : 'text-light'">
            {{ statusMessage }}
          </p>
        </aside>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, watch } from 'vue';
import { ArrowPathIcon, CheckCircleIcon, CheckIcon, SignalIcon } from '@heroicons/vue/24/outline';
import BaseButton from '../../baseComponents/BaseButton.vue';
import BaseDropdown from '../../baseComponents/BaseDropdown.vue';
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
  model: '',
  apiKey: '',
  hasApiKey: false,
  visionCapable: false,
});

const modelStatus = reactive({
  loading: false,
  models: [],
  loadedEndpoint: '',
  requestId: 0,
});

const testStatus = reactive({
  testing: false,
  connected: false,
  error: null,
  latencyMs: null,
});

const llmSettings = computed(() => settingsStore.getLlmSettings());
const llmAvailable = computed(() => settingsStore.isLlmEnabled());
const modelOptions = computed(() => {
  const models = new Set(modelStatus.models);
  if (form.model) models.add(form.model);
  return [...models];
});
const statusLabel = computed(() => {
  if (testStatus.testing) return 'Testing';
  if (testStatus.connected) return 'Connected';
  if (testStatus.error) return 'Connection failed';
  return llmAvailable.value ? 'Not tested' : 'Disabled';
});
const statusBadgeClass = computed(() => {
  if (testStatus.connected) return 'bg-primary/15 text-primary';
  if (testStatus.error) return 'bg-red-100 text-error';
  return 'bg-gray-200 text-light';
});
const statusMessage = computed(() => {
  if (testStatus.testing) return 'Checking endpoint…';
  if (testStatus.connected) return `Endpoint connected${testStatus.latencyMs ? ` in ${testStatus.latencyMs} ms` : ''}.`;
  if (testStatus.error) return testStatus.error;
  if (!form.endpoint.trim()) return 'No endpoint configured.';
  return 'Endpoint has not been tested.';
});

const syncForm = () => {
  form.enabled = Boolean(llmSettings.value.enabled);
  form.endpoint = llmSettings.value.endpoint || '';
  form.model = llmSettings.value.model || '';
  form.apiKey = '';
  form.hasApiKey = Boolean(llmSettings.value.hasApiKey);
  form.visionCapable = Boolean(llmSettings.value.visionCapable);
};

const resetForm = () => {
  syncForm();
  status.saved = false;
  status.error = null;
  testStatus.connected = false;
  testStatus.error = null;
  testStatus.latencyMs = null;
  modelStatus.models = [];
};

const requestPayload = () => ({
  endpoint: form.endpoint.trim(),
  model: form.model,
  ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
});

const onModelChange = (model) => {
  if (model !== llmSettings.value.model || form.endpoint.trim() !== llmSettings.value.endpoint) {
    form.visionCapable = false;
  }
};

const loadModels = async () => {
  if (!form.endpoint.trim()) return;
  const requestId = ++modelStatus.requestId;
  modelStatus.loading = true;
  status.error = null;
  try {
    const result = await settingsStore.loadLlmModels(requestPayload());
    if (requestId !== modelStatus.requestId) return;
    modelStatus.models = result.models || [];
    if (!modelStatus.models.length) throw new Error('No models returned by the endpoint.');
    modelStatus.loadedEndpoint = form.endpoint.trim();
    if (form.model && !modelStatus.models.includes(form.model)) {
      form.model = '';
      form.visionCapable = false;
    }
  } catch (error) {
    if (requestId !== modelStatus.requestId) return;
    status.error = error?.message || 'Unable to load models.';
  } finally {
    if (requestId === modelStatus.requestId) modelStatus.loading = false;
  }
};

let modelLoadTimer;
const scheduleModelLoad = () => {
  clearTimeout(modelLoadTimer);
  const endpoint = form.endpoint.trim();
  if (!endpoint) return;
  try {
    const url = new URL(endpoint);
    if (url.hostname === 'api.openai.com' && !form.apiKey.trim() && !form.hasApiKey) return;
  } catch {
    return;
  }
  if (modelStatus.loadedEndpoint && modelStatus.loadedEndpoint !== endpoint) {
    modelStatus.models = [];
    form.model = '';
    form.visionCapable = false;
  }
  modelLoadTimer = setTimeout(loadModels, 700);
};

watch(
  () => [form.endpoint, form.apiKey, form.hasApiKey],
  scheduleModelLoad,
);

const testEndpoint = async () => {
  if (!form.endpoint.trim() || testStatus.testing) return;
  testStatus.testing = true;
  testStatus.connected = false;
  testStatus.error = null;
  testStatus.latencyMs = null;
  try {
    const result = await settingsStore.testLlmEndpoint(requestPayload());
    testStatus.connected = true;
    testStatus.latencyMs = result.latencyMs ?? null;
  } catch (error) {
    testStatus.error = error?.message || 'Unable to connect to the LLM endpoint.';
  } finally {
    testStatus.testing = false;
  }
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
  if (form.enabled && !form.model) {
    status.error = 'Select a model before enabling LLM import.';
    return;
  }
  try {
    await settingsStore.updateLlmSettings({
      enabled: form.enabled,
      endpoint: form.endpoint,
      model: form.model,
      visionCapable: form.visionCapable,
      ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
    });
    status.saved = true;
    syncForm();
  } catch (error) {
    status.error = error?.message || 'Unable to save settings.';
  }
};

onMounted(async () => {
  await load();
});

onBeforeUnmount(() => clearTimeout(modelLoadTimer));
</script>
