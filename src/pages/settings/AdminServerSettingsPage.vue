<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:flex-row lg:items-start">
    <SettingsSidebar />
    <section class="min-w-0 flex-1">
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
            <div class="text-3xl font-bold md:text-4xl">LLM Settings</div>
        </div>
      </header>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-4 md:flex-row md:items-start">
        <form class="h-min grow rounded-2xl bg-base-alt p-5 drop-shadow-lg md:p-6" @submit.prevent="save">
          <div class="mb-6 flex items-start justify-between gap-5 border-b border-accent-alt/15 pb-6">
            <div>
              <h2 class="text-xl font-bold">Recipe Import via LLM</h2>
            </div>
            <BaseToggle v-model="form.enabled" :disabled="!form.model && !form.enabled" aria-label="Enable LLM recipe import" />
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
              <BaseToggle v-model="form.visionCapable" :disabled="!form.model" />
            </label>

            <label class="flex items-center justify-between gap-4 font-bold">
              New user access
              <BaseToggle v-model="form.defaultUserAccess" />
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
          <BaseButton
            class="mt-5"
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
        </aside>
        </div>

        <section class="w-full rounded-2xl bg-base-alt p-5 drop-shadow-lg md:p-6">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-xl font-bold">User access</h2>
            <BaseSplitButton
              v-model="usage.range"
              :options="usageRanges"
              aria-label="Usage period"
            />
          </div>
          <p v-if="usage.loading" class="py-5 text-center text-light">Loading…</p>
          <ul v-else class="flex flex-col divide-y divide-accent-alt/15">
            <li v-for="user in usage.users" :key="user.id" class="flex items-center justify-between gap-4 py-3">
              <div class="min-w-0">
                <p class="truncate font-bold">{{ user.displayName || user.username }}</p>
                <p class="text-sm text-light">
                  {{ formatNumber(user.requestCount) }} requests · {{ formatNumber(user.imageCount) }} images ·
                  {{ formatNumber(user.inputTokens) }} in · {{ formatNumber(user.outputTokens) }} out
                </p>
              </div>
              <BaseToggle
                :model-value="user.llmAccess"
                :disabled="usage.updatingUserId === user.id"
                :aria-label="`LLM access for ${user.username}`"
                @update:model-value="updateUserAccess(user, $event)"
              />
            </li>
          </ul>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, watch } from 'vue';
import { ArrowPathIcon, CheckCircleIcon, CheckIcon, SignalIcon } from '@heroicons/vue/24/outline';
import BaseButton from '../../baseComponents/BaseButton.vue';
import BaseDropdown from '../../baseComponents/BaseDropdown.vue';
import BaseSplitButton from '../../baseComponents/BaseSplitButton.vue';
import BaseTextInput from '../../baseComponents/BaseTextInput.vue';
import BaseToggle from '../../baseComponents/BaseToggle.vue';
import SettingsSidebar from '../../shared/SettingsSidebar.vue';
import { useSettingsStore } from '../../stores/settingsStore';

const settingsStore = useSettingsStore();

const usageRanges = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '1m', label: '30d' },
  { value: 'all', label: 'All' },
];
const formatNumber = (value) => new Intl.NumberFormat().format(Number(value) || 0);

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
  defaultUserAccess: true,
});

const usage = reactive({
  range: '7d',
  users: [],
  loading: false,
  updatingUserId: '',
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
const llmAvailable = computed(() => Boolean(
  llmSettings.value.enabled && llmSettings.value.endpoint && llmSettings.value.model,
));
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
  form.defaultUserAccess = llmSettings.value.defaultUserAccess !== false;
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

const loadUsage = async () => {
  usage.loading = true;
  status.error = null;
  try {
    const res = await fetch(`/api/admin/llm/users?range=${encodeURIComponent(usage.range)}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to load LLM usage.');
    usage.users = data.users || [];
  } catch (error) {
    status.error = error?.message || 'Unable to load LLM usage.';
  } finally {
    usage.loading = false;
  }
};

const updateUserAccess = async (user, enabled) => {
  usage.updatingUserId = user.id;
  status.error = null;
  try {
    const res = await fetch(`/api/admin/llm/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to update LLM access.');
    user.llmAccess = enabled;
  } catch (error) {
    status.error = error?.message || 'Unable to update LLM access.';
  } finally {
    usage.updatingUserId = '';
  }
};

const load = async () => {
  status.loading = true;
  status.error = null;
  try {
    await settingsStore.loadSettings(true);
    syncForm();
    await loadUsage();
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
      defaultUserAccess: form.defaultUserAccess,
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

watch(() => usage.range, loadUsage);

onBeforeUnmount(() => clearTimeout(modelLoadTimer));
</script>
