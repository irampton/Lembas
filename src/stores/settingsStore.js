import { reactive } from 'vue';

const state = reactive({
  settings: {},
  loading: false,
  ready: false,
  saving: false,
  error: null,
});

const normalizeSettings = (incoming) => {
  const llm = incoming?.llm || {};
  return {
    llm: {
      enabled: Boolean(llm.enabled),
      endpoint: (llm.endpoint || '').trim(),
    },
  };
};

const loadSettings = async (force = false) => {
  if (state.loading || (state.ready && !force)) return state.settings;
  state.loading = true;
  state.error = null;
  try {
    const res = await fetch('/api/settings', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || 'Unable to load settings.');
    }
    state.settings = normalizeSettings(data.settings || {});
    state.ready = true;
    return state.settings;
  } catch (error) {
    state.error = error?.message || 'Unable to load settings.';
    throw error;
  } finally {
    state.loading = false;
  }
};

const updateLlmSettings = async (payload) => {
  state.saving = true;
  state.error = null;
  try {
    const res = await fetch('/api/admin/settings/llm', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || 'Unable to save settings.');
    }
    const normalized = normalizeSettings(data.settings || {});
    state.settings = { ...state.settings, ...normalized };
    state.ready = true;
    return state.settings.llm;
  } catch (error) {
    state.error = error?.message || 'Unable to save settings.';
    throw error;
  } finally {
    state.saving = false;
    state.loading = false;
  }
};

const reset = () => {
  state.settings = {};
  state.loading = false;
  state.ready = false;
  state.saving = false;
  state.error = null;
};

const getLlmSettings = () => state.settings.llm || { enabled: false, endpoint: '' };
const isLlmEnabled = () => Boolean(getLlmSettings().enabled) && Boolean(getLlmSettings().endpoint);

export const useSettingsStore = () => ({
  state,
  loadSettings,
  updateLlmSettings,
  reset,
  getLlmSettings,
  isLlmEnabled,
});
