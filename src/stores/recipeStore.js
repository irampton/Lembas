import { reactive } from 'vue';
import socket from '../services/socket';

const state = reactive({
  recipes: [],
  recipeDetails: {},
  sharedRecipes: [],
  cookbooks: [],
  sharedCookbooks: [],
  loading: false,
  error: null,
  ready: false,
  importedDraft: null,
  searchQuery: '',
  excludedCookbookIds: [],
});

const sortByTitle = (list) =>
  [...list].sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));

const sortByDisplayOrder = (list) =>
  [...list].sort((a, b) =>
    (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) ||
    String(a.createdAt || '').localeCompare(String(b.createdAt || '')) ||
    String(a.id || '').localeCompare(String(b.id || '')));

const applyLibrary = (payload) => {
  if (!payload) return;
  const recipes = payload.recipes || [];
  const summariesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  Object.keys(state.recipeDetails).forEach((id) => {
    if (!summariesById.has(id)) {
      delete state.recipeDetails[id];
      return;
    }
    const summary = summariesById.get(id);
    state.recipeDetails[id] = {
      ...state.recipeDetails[id],
      canEdit: summary.canEdit,
      canManageCookbook: summary.canManageCookbook,
      isSharedCookbook: summary.isSharedCookbook,
      cookbookId: summary.cookbookId,
    };
  });
  state.recipes = sortByTitle(recipes);
  state.cookbooks = sortByDisplayOrder(payload.cookbooks || []);
  state.sharedCookbooks = sortByDisplayOrder(payload.sharedCookbooks || []);
  state.ready = true;
};

const applyRecipe = (recipe) => {
  if (!recipe?.id) return;
  if (!recipe.isSummary) {
    state.recipeDetails[recipe.id] = recipe;
  }
  const summary = recipe.isSummary ? recipe : {
    ...recipe,
    ingredients: (recipe.ingredients || []).map((ingredient) => ({ name: ingredient?.name || '' })),
    ingredientPreview: recipe.ingredientPreview || '',
    isSummary: true,
  };
  state.recipes = sortByTitle(state.recipes.some((item) => item.id === summary.id)
    ? state.recipes.map((item) => item.id === summary.id ? { ...item, ...summary } : item)
    : [...state.recipes, summary]);
};

const removeRecipe = (id) => {
  if (!id) return;
  state.recipes = state.recipes.filter((recipe) => recipe.id !== id);
  delete state.recipeDetails[id];
};

const recipeRequests = new Map();

const loadRecipe = (id, { force = false } = {}) => {
  if (!id) return Promise.reject(new Error('Missing recipe id.'));
  if (!force && state.recipeDetails[id]) return Promise.resolve(state.recipeDetails[id]);
  if (recipeRequests.has(id)) return recipeRequests.get(id);
  const request = new Promise((resolve, reject) => {
    socket.emit('recipe:get', id, (response) => {
      if (response?.success) {
        applyRecipe(response.data);
        resolve(state.recipeDetails[id]);
      } else {
        reject(new Error(response?.error || 'Unable to load recipe.'));
      }
    });
  }).finally(() => recipeRequests.delete(id));
  recipeRequests.set(id, request);
  return request;
};

socket.on('library:updated', (payload) => {
  applyLibrary(payload);
});

socket.on('recipe:updated', applyRecipe);
socket.on('recipe:removed', ({ id } = {}) => removeRecipe(id));
socket.on('recipe:pairing-updated', ({ recipeIds = [] } = {}) => {
  recipeIds.forEach((id) => {
    if (state.recipeDetails[id]) loadRecipe(id, { force: true }).catch(() => {});
  });
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
        const saved = response.data;
        const existing = state.recipes.find((item) => item.id === saved.id);
        const sharedCookbook = state.sharedCookbooks.find((item) => item.id === saved.cookbookId);
        const savedWithPermissions = {
          ...existing,
          ...saved,
          isSummary: false,
          canEdit: true,
          canManageCookbook: state.cookbooks.some((item) => item.id === saved.cookbookId)
            || Boolean(sharedCookbook?.canManageCookbook),
          isSharedCookbook: Boolean(sharedCookbook),
        };
        applyRecipe(savedWithPermissions);
        resolve(savedWithPermissions);
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
        removeRecipe(id);
        resolve(true);
      } else {
        const err = response?.error || 'Unable to delete recipe.';
        state.error = err;
        reject(new Error(err));
      }
    });
  });

const addRecipePairing = (recipeId, pairedRecipeId) =>
  new Promise((resolve, reject) => {
    socket.emit('recipe:pair', { recipeId, pairedRecipeId }, (response) => {
      if (response?.success) {
        Promise.all([loadRecipe(recipeId, { force: true }), loadRecipe(pairedRecipeId, { force: true })])
          .then(() => resolve(true))
          .catch(reject);
      } else {
        reject(new Error(response?.error || 'Unable to add recipe pairing.'));
      }
    });
  });

const removeRecipePairing = (recipeId, pairedRecipeId) =>
  new Promise((resolve, reject) => {
    socket.emit('recipe:unpair', { recipeId, pairedRecipeId }, (response) => {
      if (response?.success) {
        Promise.all([loadRecipe(recipeId, { force: true }), loadRecipe(pairedRecipeId, { force: true })])
          .then(() => resolve(true))
          .catch(reject);
      } else {
        reject(new Error(response?.error || 'Unable to remove recipe pairing.'));
      }
    });
  });

const saveCookbook = async (cookbook) => {
  const isEditing = Boolean(cookbook.id);
  const res = await fetch(isEditing ? `/api/cookbooks/${cookbook.id}` : '/api/cookbooks', {
    method: isEditing ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(cookbook),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to save cookbook.');

  const ownedIndex = state.cookbooks.findIndex((item) => item.id === data.cookbook.id);
  const sharedIndex = state.sharedCookbooks.findIndex((item) => item.id === data.cookbook.id);
  if (sharedIndex >= 0 && ownedIndex < 0) {
    state.sharedCookbooks = sortByDisplayOrder(state.sharedCookbooks.map((item) =>
      item.id === data.cookbook.id ? { ...item, ...data.cookbook } : item));
  } else {
    state.cookbooks = sortByDisplayOrder(ownedIndex >= 0
      ? state.cookbooks.map((item) => item.id === data.cookbook.id ? data.cookbook : item)
      : [...state.cookbooks, data.cookbook]);
  }
  return data.cookbook;
};

const reorderCookbooks = async (cookbookIds) => {
  const previous = [...state.cookbooks];
  const byId = new Map(state.cookbooks.map((cookbook) => [cookbook.id, cookbook]));
  state.cookbooks = cookbookIds.map((id, index) => ({ ...byId.get(id), displayOrder: index }));
  try {
    const res = await fetch('/api/cookbooks/order', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ cookbookIds }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to reorder cookbooks.');
    state.cookbooks = sortByDisplayOrder(data.cookbooks || state.cookbooks);
  } catch (error) {
    state.cookbooks = previous;
    state.error = error.message || 'Unable to reorder cookbooks.';
    throw error;
  }
};

const deleteCookbook = async (id, options) => {
  const res = await fetch(`/api/cookbooks/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(options || {}),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data?.error || 'Unable to delete cookbook.');
  state.cookbooks = sortByDisplayOrder(data.cookbooks || state.cookbooks.filter((cookbook) => cookbook.id !== id));
  state.excludedCookbookIds = state.excludedCookbookIds.filter((cookbookId) => cookbookId !== id);
};

const getRecipeById = (id) => state.recipeDetails[id] || state.recipes.find((recipe) => recipe.id === id);
const getSharedRecipeById = (id) => state.sharedRecipes.find((recipe) => recipe.id === id);
const getCookbookById = (id) =>
  state.cookbooks.find((cb) => cb.id === id) || state.sharedCookbooks.find((cb) => cb.id === id);

export const useRecipeStore = () => ({
  state,
  loadRecipes: loadLibrary,
  loadLibrary,
  loadSharedRecipes,
  loadRecipe,
  saveRecipe,
  deleteRecipe,
  addRecipePairing,
  removeRecipePairing,
  saveCookbook,
  reorderCookbooks,
  deleteCookbook,
  getRecipeById,
  getSharedRecipeById,
  getCookbookById,
  reset: () => {
    state.recipes = [];
    state.recipeDetails = {};
    state.sharedRecipes = [];
    state.cookbooks = [];
    state.sharedCookbooks = [];
    state.ready = false;
    state.error = null;
    state.searchQuery = '';
    state.excludedCookbookIds = [];
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
