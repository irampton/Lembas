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
      model: (llm.model || '').trim(),
      hasApiKey: Boolean(llm.hasApiKey),
      visionCapable: Boolean(llm.visionCapable),
      defaultUserAccess: llm.defaultUserAccess !== false,
      userAccess: llm.userAccess !== false,
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

const postLlmAdminAction = async (action, payload) => {
  const res = await fetch(`/api/admin/settings/llm/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Unable to connect to the LLM endpoint.');
  }
  return data;
};

const testLlmEndpoint = (payload) => postLlmAdminAction('test', payload);
const loadLlmModels = (payload) => postLlmAdminAction('models', payload);

const reset = () => {
  state.settings = {};
  state.loading = false;
  state.ready = false;
  state.saving = false;
  state.error = null;
};

const getLlmSettings = () => state.settings.llm || { enabled: false, endpoint: '' };
const isLlmEnabled = () => Boolean(getLlmSettings().enabled)
  && Boolean(getLlmSettings().endpoint)
  && Boolean(getLlmSettings().model)
  && getLlmSettings().userAccess !== false;

export const useSettingsStore = () => ({
  state,
  loadSettings,
  updateLlmSettings,
  testLlmEndpoint,
  loadLlmModels,
  reset,
  getLlmSettings,
  isLlmEnabled,
});
