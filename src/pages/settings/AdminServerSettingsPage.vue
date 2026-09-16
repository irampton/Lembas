<template>
  <section>
    <header>
      <div>
        <p>Admin</p>
        <h1>Server settings</h1>
        <p>Configure integrations and platform-wide toggles.</p>
      </div>
      <span
        v-if="status.loading"
      >
        <ArrowPathIcon />
        Loading…
      </span>
    </header>

    <div>
      <form
        @submit.prevent="save"
      >
        <div>
          <div>
            <p>LLM import</p>
            <p>Enable importing recipes through an OpenAI-compatible endpoint.</p>
          </div>
          <label>
            <input v-model="form.enabled" type="checkbox" />
            Enabled
          </label>
        </div>

        <label>
          <span>LLM endpoint</span>
          <input
            v-model="form.endpoint"
            type="text"
            placeholder="https://your-llm-server/v1/chat/completions"
            :disabled="!form.enabled || status.loading || settingsStore.state.saving"
          />
          <p>
            OpenAI-compatible endpoint (tested with llama.cpp). Required when LLM import is enabled.
          </p>
        </label>

        <div>
          <button
            type="submit"
            :disabled="status.loading || settingsStore.state.saving"
          >
            <CheckIcon v-if="!settingsStore.state.saving" />
            <ArrowPathIcon v-else />
            {{ settingsStore.state.saving ? 'Saving…' : 'Save changes' }}
          </button>
          <button
            type="button"
            :disabled="status.loading || settingsStore.state.saving"
            @click="resetForm"
          >
            Reset
          </button>
          <span v-if="status.saved">Saved.</span>
        </div>

        <div v-if="status.error">
          {{ status.error }}
        </div>
      </form>

      <div>
        <div>
          <div>
            <p>Status</p>
            <p>What users will see in the app.</p>
          </div>
          <span
          >
            {{ llmAvailable ? 'Enabled' : 'Disabled' }}
          </span>
        </div>
        <p>
          {{ llmAvailable ? 'LLM import is available on create/import pages.' : 'Users will not see LLM import until it is enabled with an endpoint.' }}
        </p>
        <div>
          <p>Current endpoint</p>
          <p>
            {{ llmSettings.endpoint ? llmSettings.endpoint : 'Not configured' }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive } from 'vue';
import { ArrowPathIcon, CheckIcon } from '@heroicons/vue/24/outline';
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
