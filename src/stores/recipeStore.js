import { reactive } from 'vue';
import socket from '../services/socket';

const state = reactive({
  recipes: [],
  sharedRecipes: [],
  cookbooks: [],
  sharedCookbooks: [],
  loading: false,
  error: null,
  ready: false,
  importedDraft: null,
});

const sortByTitle = (list) =>
  [...list].sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));

const sortByName = (list) =>
  [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

const applyLibrary = (payload) => {
  if (!payload) return;
  state.recipes = sortByTitle(payload.recipes || []);
  state.cookbooks = sortByName(payload.cookbooks || []);
  state.sharedCookbooks = sortByName(payload.sharedCookbooks || []);
  state.ready = true;
};

socket.on('library:updated', (payload) => {
  applyLibrary(payload);
});

socket.on('connect', () => {
  if (!state.ready) {
    loadLibrary();
  }
});

socket.on('disconnect', () => {
  state.ready = false;
});

const loadLibrary = () => {
  if (!socket.connected) {
    socket.connect();
  }
  if (state.loading) return;
  state.loading = true;
  state.error = null;

  socket.emit('library:list', (response) => {
    if (response?.success) {
      applyLibrary(response.data || {});
    } else {
      state.error = response?.error || 'Unable to load recipes.';
    }
    state.loading = false;
  });
};

const loadSharedRecipes = async () => {
  try {
    const res = await fetch('/api/shared-recipes', { credentials: 'include' });
    const data = await res.json();
    if (res.ok && data.success) {
      state.sharedRecipes = sortByTitle(data.recipes || []);
    }
  } catch (error) {
    console.error(error);
  }
};

const saveRecipe = (recipe) =>
  new Promise((resolve, reject) => {
    state.error = null;
    socket.emit('recipe:save', recipe, (response) => {
      if (response?.success) {
        resolve(response.data);
      } else {
        const err = response?.error || 'Unable to save recipe.';
        state.error = err;
        reject(new Error(err));
      }
    });
  });

const deleteRecipe = (id) =>
  new Promise((resolve, reject) => {
    if (!id) return reject(new Error('Missing recipe id.'));
    state.error = null;
    socket.emit('recipe:delete', id, (response) => {
      if (response?.success) {
        resolve(true);
      } else {
        const err = response?.error || 'Unable to delete recipe.';
        state.error = err;
        reject(new Error(err));
      }
    });
  });

const getRecipeById = (id) => state.recipes.find((recipe) => recipe.id === id);
const getSharedRecipeById = (id) => state.sharedRecipes.find((recipe) => recipe.id === id);
const getCookbookById = (id) =>
  state.cookbooks.find((cb) => cb.id === id) || state.sharedCookbooks.find((cb) => cb.id === id);

export const useRecipeStore = () => ({
  state,
  loadRecipes: loadLibrary,
  loadLibrary,
  loadSharedRecipes,
  saveRecipe,
  deleteRecipe,
  getRecipeById,
  getSharedRecipeById,
  getCookbookById,
  reset: () => {
    state.recipes = [];
    state.sharedRecipes = [];
    state.cookbooks = [];
    state.sharedCookbooks = [];
    state.ready = false;
    state.error = null;
  },
  setImportedDraft: (draft) => {
    state.importedDraft = draft || null;
  },
  consumeImportedDraft: () => {
    const draft = state.importedDraft;
    state.importedDraft = null;
    return draft;
  },
});
