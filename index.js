import express from "express";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { Server } from "socket.io";
import { fileURLToPath } from "node:url";
import { buildRecipeFromText, listLlmModels, testLlmEndpoint } from "./LLM.js";
import * as db from "./db.js";
import * as auth from "./auth.js";
import { formatQuantity } from "./src/utils/formatQuantity.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true },
});

const emitFriendUpdate = (userId) => {
  if (!userId) return;
  io.to(`user:${userId}`).emit("friends:updated");
};

const emitLibraryForUser = (userId) => {
  if (!userId) return;
  io.to(`user:${userId}`).emit("library:updated", db.getLibraryForUser(userId));
};

const emitLibraryForCookbookMembers = (cookbookId) => {
  const members = db.listCookbookMemberIds(cookbookId);
  members.forEach((memberId) => emitLibraryForUser(memberId));
};

const emitRecipeUpdate = (recipe, previousCookbookId = null) => {
  const nextMembers = new Map(
    db.listCookbookMembers(recipe.cookbookId).map((member) => [member.userId, member]),
  );
  if (previousCookbookId && previousCookbookId !== recipe.cookbookId) {
    db.listCookbookMembers(previousCookbookId).forEach(({ userId }) => {
      if (!nextMembers.has(userId)) {
        io.to(`user:${userId}`).emit("recipe:removed", { id: recipe.id });
      }
    });
  }
  nextMembers.forEach(({ userId, accessLevel }) => {
    io.to(`user:${userId}`).emit("recipe:updated", {
      ...recipe,
      canEdit: ["recipes", "cookbook"].includes(accessLevel),
      canManageCookbook: accessLevel === "cookbook",
      isSharedCookbook: userId !== recipe.ownerId,
    });
  });
};

const emitRecipeRemoval = (recipe) => {
  db.listCookbookMemberIds(recipe.cookbookId).forEach((userId) => {
    io.to(`user:${userId}`).emit("recipe:removed", { id: recipe.id });
  });
};

const emitPairingUpdatesForRecipe = (recipe) => {
  const pairedRecipeIds = db.getRecipePairingIds(recipe.id);
  if (!pairedRecipeIds.length) return;

  const affectedRecipeIds = [recipe.id, ...pairedRecipeIds];
  const memberIds = new Set(db.listCookbookMemberIds(recipe.cookbookId));
  pairedRecipeIds.forEach((pairedRecipeId) => {
    const pairedRecipe = db.getRecipeByIdAnyOwner(pairedRecipeId);
    if (pairedRecipe) {
      db.listCookbookMemberIds(pairedRecipe.cookbookId).forEach((memberId) => memberIds.add(memberId));
    }
  });
  memberIds.forEach((memberId) => {
    io.to(`user:${memberId}`).emit("recipe:pairing-updated", { recipeIds: affectedRecipeIds });
  });
};

app.use(express.json({ limit: "10mb" }));
app.use(auth.attachSession);

const distDir = path.resolve(__dirname, "dist");
const indexHtmlPath = path.join(distDir, "index.html");

const normalizeRecipe = (incoming) => {
  const now = new Date().toISOString();
  const servings = incoming.servings || {};
  const servingQuantity =
    incoming.servingsQuantity?.trim?.() ||
    servings.quantity?.toString?.().trim?.() ||
    (typeof servings === "string" ? servings.trim() : "");
  const servingUnit = incoming.servingsUnit?.trim?.() || servings.unit?.toString?.().trim?.() || "";
  return {
    id: incoming.id || crypto.randomUUID(),
    title: incoming.title?.trim() || "Untitled Recipe",
    description: incoming.description?.trim() || "",
    author: incoming.author?.trim() || "",
    createdAt: incoming.createdAt || now,
    tags: (incoming.tags || [])
      .map((tag) => (tag || "").trim())
      .filter(Boolean),
    ingredients: (incoming.ingredients || []).map((item) => {
      const quantityRaw = item.quantityRaw ?? item.quantity ?? "";
      return {
        id: item.id || crypto.randomUUID(),
        name: item.name?.trim() || "",
        quantity: formatQuantity(quantityRaw),
        quantityRaw,
        unit: item.unit || "",
      };
    }),
    steps: (incoming.steps || []).map((step) => step?.trim()).filter(Boolean),
    ownerId: incoming.ownerId?.trim?.() || incoming.ownerID?.trim?.() || "",
    cookbookId: incoming.cookbookId?.trim?.() || "",
    isPublic: Boolean(incoming.isPublic),
    notes: incoming.notes?.trim?.() || "",
    servingsVerb: incoming.servingsVerb === "Serves" ? "Serves" : "Makes",
    servingsQuantity: servingQuantity,
    servingsUnit: servingUnit,
    history: Array.isArray(incoming.history) ? incoming.history : [],
    shareHistory: Boolean(incoming.shareHistory),
  };
};

const ingredientText = (ingredient) => [
  formatQuantity(ingredient?.quantity ?? ingredient?.quantityRaw ?? ""),
  ingredient?.unit,
  ingredient?.name,
].filter(Boolean).join(" ");

const ingredientQuantityText = (ingredient) => [
  formatQuantity(ingredient?.quantity ?? ingredient?.quantityRaw ?? ""),
  ingredient?.unit,
].filter(Boolean).join(" ");

const ingredientChanges = (before = [], after = []) => {
  const remainingBefore = new Map(before.map((ingredient, index) => [ingredient.id || `before-${index}`, ingredient]));
  const changes = [];
  after.forEach((ingredient, index) => {
    const key = ingredient.id || `after-${index}`;
    const previous = remainingBefore.get(key);
    if (!previous) {
      changes.push({ type: "added", ingredient: ingredientText(ingredient) });
      return;
    }
    remainingBefore.delete(key);
    const oldQuantity = ingredientQuantityText(previous);
    const newQuantity = ingredientQuantityText(ingredient);
    if (oldQuantity !== newQuantity) {
      changes.push({
        type: "changed",
        ingredient: ingredient.name,
        from: { quantity: previous.quantity ?? previous.quantityRaw ?? "", unit: previous.unit || "" },
        to: { quantity: ingredient.quantity ?? ingredient.quantityRaw ?? "", unit: ingredient.unit || "" },
      });
    }
  });
  remainingBefore.forEach((ingredient) => changes.push({ type: "removed", ingredient: ingredientText(ingredient) }));
  return changes;
};

const historyForSave = (existing, normalized) => {
  if (!existing) {
    return [{ id: crypto.randomUUID(), type: "created", createdAt: new Date().toISOString() }];
  }
  const changes = ingredientChanges(existing.ingredients, normalized.ingredients);
  return changes.length
    ? [{ id: crypto.randomUUID(), type: "edit", createdAt: new Date().toISOString(), changes }, ...(existing.history || [])]
    : (existing.history || []);
};

const getLlmSettings = () => {
  const raw = db.getSetting("llm", null) || {};
  return {
    enabled: Boolean(raw.enabled),
    endpoint: (raw.endpoint || "").trim(),
    model: (raw.model || "").trim(),
    apiKey: (raw.apiKey || "").trim(),
    visionCapable: Boolean(raw.visionCapable),
    defaultUserAccess: raw.defaultUserAccess !== false,
  };
};

const getPublicLlmSettings = (userId) => {
  const settings = getLlmSettings();
  return {
    enabled: settings.enabled,
    endpoint: settings.endpoint,
    model: settings.model,
    hasApiKey: Boolean(settings.apiKey),
    visionCapable: settings.visionCapable,
    defaultUserAccess: settings.defaultUserAccess,
    userAccess: userId ? db.userHasLlmAccess(userId) : true,
  };
};

const getRequestLlmCredentials = (body = {}) => {
  const saved = getLlmSettings();
  const endpoint = (body.endpoint || saved.endpoint || "").trim();
  const mayUseSavedKey = endpoint === saved.endpoint;
  return {
    endpoint,
    apiKey: (body.apiKey || (mayUseSavedKey ? saved.apiKey : "") || "").trim(),
    model: (body.model || (mayUseSavedKey ? saved.model : "") || "").trim(),
    visionCapable: Boolean(body.visionCapable ?? (mayUseSavedKey ? saved.visionCapable : false)),
  };
};

const bootstrapLlmSettingsFromEnv = () => {
  const envEndpoint = (process.env.LLM_ENDPOINT || "").trim();
  if (!envEndpoint) return;
  const existing = getLlmSettings();
  const sameEndpoint = existing.endpoint === envEndpoint;
  db.setSetting("llm", {
    ...existing,
    enabled: true,
    endpoint: envEndpoint,
    model: (process.env.LLM_MODEL || (sameEndpoint ? existing.model : "") || "").trim(),
    apiKey: (process.env.LLM_API_KEY || (sameEndpoint ? existing.apiKey : "") || "").trim(),
    visionCapable: sameEndpoint ? existing.visionCapable : false,
  });
};

if (!fs.existsSync(indexHtmlPath)) {
  console.warn("Vite build not found. Run `npm run build` to generate client assets.");
}

app.use(express.static(distDir));

bootstrapLlmSettingsFromEnv();
db.backfillCookbookAssignments();

app.post("/api/llm-import", auth.requireAuth, async (req, res) => {
  const { text, imageBase64 } = req.body || {};
  const incomingText = (text || "").toString();

  if (!incomingText.trim() && !imageBase64) {
    res.status(400).json({ success: false, error: "Please provide recipe text or an image." });
    return;
  }

  const llmSettings = getLlmSettings();
  if (!llmSettings.enabled || !llmSettings.endpoint) {
    res.status(400).json({ success: false, error: "LLM import is disabled." });
    return;
  }

  if (!db.userHasLlmAccess(req.user.id)) {
    res.status(403).json({ success: false, error: "LLM import access is disabled for your account." });
    return;
  }

  if (imageBase64 && !llmSettings.visionCapable) {
    res.status(400).json({ success: false, error: "The selected model does not support images." });
    return;
  }

  const requestId = db.recordLlmRequest(req.user.id, Boolean(imageBase64));

  try {
    const { recipe, usage } = await buildRecipeFromText(incomingText.trim(), { ...llmSettings, imageBase64 });
    db.updateLlmRequestUsage(requestId, usage);
    res.json({ success: true, data: recipe });
  } catch (error) {
    console.error("[llm] import failed:", error);
    if (error?.code === "EMPTY_LLM_RECIPE") {
      res.status(422).json({
        success: false,
        error: "The LLM returned an empty recipe. Try again with more complete recipe text or a clearer image.",
      });
      return;
    }
    res.status(500).json({ success: false, error: "Unable to import recipe right now." });
  }
});

app.get("/api/settings", auth.requireAuth, (req, res) => {
  res.json({ success: true, settings: { llm: getPublicLlmSettings(req.user.id) } });
});

app.put("/api/admin/settings/llm", auth.requireAdmin, (req, res) => {
  const { enabled, endpoint, model, apiKey, visionCapable, defaultUserAccess } = req.body || {};
  const current = getLlmSettings();
  const normalizedModel = (model || "").trim();
  if (enabled && !normalizedModel) {
    res.status(400).json({ success: false, error: "Select a model before enabling LLM import." });
    return;
  }
  const normalized = {
    enabled: Boolean(enabled),
    endpoint: (endpoint || "").trim(),
    model: normalizedModel,
    visionCapable: Boolean(visionCapable),
    defaultUserAccess: Boolean(defaultUserAccess),
    apiKey: typeof apiKey === "string" && apiKey.trim()
      ? apiKey.trim()
      : ((endpoint || "").trim() === current.endpoint ? current.apiKey : ""),
  };
  db.setSetting("llm", normalized);
  res.json({ success: true, settings: { llm: getPublicLlmSettings(req.user.id) } });
});

const llmUsageRanges = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "1m": 30 * 24 * 60 * 60 * 1000,
  all: null,
};

app.get("/api/admin/llm/users", auth.requireAdmin, (req, res) => {
  const range = Object.hasOwn(llmUsageRanges, req.query.range) ? req.query.range : "7d";
  const duration = llmUsageRanges[range];
  const since = duration ? new Date(Date.now() - duration).toISOString() : null;
  res.json({ success: true, users: db.getLlmUsageByUser(since), range });
});

app.patch("/api/admin/llm/users/:id", auth.requireAdmin, (req, res) => {
  const enabled = Boolean(req.body?.enabled);
  if (!db.updateUserLlmAccess(req.params.id, enabled)) {
    res.status(404).json({ success: false, error: "User not found." });
    return;
  }
  res.json({ success: true, enabled });
});

app.post("/api/admin/settings/llm/test", auth.requireAdmin, async (req, res) => {
  const credentials = getRequestLlmCredentials(req.body);
  const { endpoint } = credentials;
  if (!endpoint) {
    res.status(400).json({ success: false, error: "Enter an LLM endpoint." });
    return;
  }

  try {
    const result = await testLlmEndpoint(endpoint, credentials);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("[llm] endpoint test failed:", error);
    res.status(502).json({
      success: false,
      error: error?.message || "Unable to connect to the LLM endpoint.",
    });
  }
});

app.post("/api/admin/settings/llm/models", auth.requireAdmin, async (req, res) => {
  const credentials = getRequestLlmCredentials(req.body);
  if (!credentials.endpoint) {
    res.status(400).json({ success: false, error: "Enter an LLM endpoint." });
    return;
  }

  try {
    const models = await listLlmModels(credentials.endpoint, credentials);
    res.json({ success: true, models });
  } catch (error) {
    console.error("[llm] model list failed:", error);
    res.status(502).json({
      success: false,
      error: error?.message || "Unable to load models from the LLM endpoint.",
    });
  }
});

app.post("/api/signup", auth.signupHandler);
app.post("/api/login", auth.loginHandler);
app.post("/api/logout", auth.logoutHandler);
app.get("/api/me", auth.meHandler);
app.put("/api/profile", auth.requireAuth, auth.updateProfileHandler);

app.post("/api/onboarding", auth.requireAuth, (req, res) => {
  const displayName = (req.body?.displayName || "").trim();
  const cookbookName = (req.body?.cookbookName || "").trim();
  const color = (req.body?.color || "").trim();

  if (!displayName || Array.from(displayName).length > 24) {
    res.status(400).json({ success: false, error: "Display name must be between 1 and 24 characters." });
    return;
  }
  if (!cookbookName || cookbookName.length > 80) {
    res.status(400).json({ success: false, error: "Cookbook name must be between 1 and 80 characters." });
    return;
  }
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    res.status(400).json({ success: false, error: "Choose a valid cookbook color." });
    return;
  }

  const result = db.completeUserOnboarding(req.user.id, { displayName, cookbookName, color });
  if (!result) {
    res.status(404).json({ success: false, error: "User not found." });
    return;
  }
  emitLibraryForUser(req.user.id);
  res.json({ success: true, user: auth.sanitizeUser(result.user), cookbook: result.cookbook });
});

app.get("/api/users/search", auth.requireAuth, (req, res) => {
  const q = (req.query.q || "").toString().trim().toLowerCase();
  const friendsOnly = req.query.scope === "friends" || req.query.friendsOnly === "true";
  if (!q) {
    res.json({ success: true, users: [] });
    return;
  }
  const userList = friendsOnly
    ? db.listFriendsForUser(req.user.id).map((friend) => ({ id: friend.userId, username: friend.username, displayName: friend.displayName }))
    : db
        .getUsers()
        .filter((u) => u.id !== req.user.id)
        .map((u) => ({ id: u.id, username: u.username, displayName: u.displayName }));

  const matches = userList.filter((u) =>
    u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)
  ).slice(0, 10);
  res.json({ success: true, users: matches });
});

app.get("/api/friends", auth.requireAuth, (req, res) => {
  const friends = db.listFriendsForUser(req.user.id);
  const requests = db.listFriendRequests(req.user.id);
  res.json({ success: true, friends, requests });
});

app.get("/api/friends/search", auth.requireAuth, (req, res) => {
  const q = (req.query.q || "").toString().trim().toLowerCase();
  if (!q) {
    res.json({ success: true, users: [] });
    return;
  }
  const friends = db.listFriendsForUser(req.user.id);
  const friendIds = new Set(friends.map((f) => f.userId));
  const pending = db.listFriendRequests(req.user.id);
  const incomingIds = new Set((pending.incoming || []).map((r) => r.fromUserId));
  const outgoingIds = new Set((pending.outgoing || []).map((r) => r.toUserId));

  const users = db
    .getUsers()
    .filter((u) => u.id !== req.user.id && !friendIds.has(u.id) && (
      u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)
    ))
    .slice(0, 10)
    .map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      isFriend: friendIds.has(u.id),
      incomingRequest: incomingIds.has(u.id),
      outgoingRequest: outgoingIds.has(u.id),
    }));

  res.json({ success: true, users });
});

app.post("/api/friend-requests", auth.requireAuth, (req, res) => {
  const { userId } = req.body || {};
  if (!userId) {
    res.status(400).json({ success: false, error: "Missing user id." });
    return;
  }
  if (userId === req.user.id) {
    res.status(400).json({ success: false, error: "You cannot friend yourself." });
    return;
  }
  const target = db.findUserById(userId);
  if (!target) {
    res.status(404).json({ success: false, error: "User not found." });
    return;
  }
  if (db.areFriends(req.user.id, userId)) {
    res.status(400).json({ success: false, error: "You are already friends." });
    return;
  }

  const opposite = db.findPendingFriendRequest(userId, req.user.id);
  if (opposite) {
    db.setFriendRequestStatus(opposite.id, "accepted");
    db.markRequestsAcceptedBetween(req.user.id, userId);
    const friendship = db.addFriendship(req.user.id, userId);
    emitFriendUpdate(req.user.id);
    emitFriendUpdate(userId);
    res.json({ success: true, friendship, autoAccepted: true });
    return;
  }

  const request = db.upsertFriendRequest(req.user.id, userId);
  emitFriendUpdate(req.user.id);
  emitFriendUpdate(userId);
  res.json({ success: true, request });
});

app.post("/api/friend-requests/:id/accept", auth.requireAuth, (req, res) => {
  const request = db.getFriendRequestById(req.params.id);
  if (!request) {
    res.status(404).json({ success: false, error: "Request not found." });
    return;
  }
  if (request.toUserId !== req.user.id) {
    res.status(403).json({ success: false, error: "You cannot accept this request." });
    return;
  }
  if (request.status !== "pending") {
    res.status(400).json({ success: false, error: "This request has already been handled." });
    return;
  }

  db.setFriendRequestStatus(request.id, "accepted");
  db.markRequestsAcceptedBetween(request.fromUserId, request.toUserId);
  const friendship = db.addFriendship(request.fromUserId, request.toUserId);
  emitFriendUpdate(req.user.id);
  emitFriendUpdate(request.fromUserId);
  res.json({ success: true, friendship });
});

app.post("/api/friend-requests/:id/reject", auth.requireAuth, (req, res) => {
  const request = db.getFriendRequestById(req.params.id);
  if (!request) {
    res.status(404).json({ success: false, error: "Request not found." });
    return;
  }
  if (request.toUserId !== req.user.id) {
    res.status(403).json({ success: false, error: "You cannot reject this request." });
    return;
  }
  if (request.status !== "pending") {
    res.status(400).json({ success: false, error: "This request has already been handled." });
    return;
  }
  db.setFriendRequestStatus(request.id, "rejected");
  emitFriendUpdate(req.user.id);
  emitFriendUpdate(request.fromUserId);
  res.json({ success: true });
});

app.delete("/api/friends/:friendId", auth.requireAuth, (req, res) => {
  const friendId = req.params.friendId;
  if (!friendId) {
    res.status(400).json({ success: false, error: "Missing friend id." });
    return;
  }
  if (!db.areFriends(req.user.id, friendId)) {
    res.status(404).json({ success: false, error: "Not friends." });
    return;
  }
  const removed = db.removeFriendship(req.user.id, friendId);
  db.deleteSharesBetweenUsers(req.user.id, friendId);
  db.markRequestsAcceptedBetween(req.user.id, friendId);
  if (!removed) {
    res.status(500).json({ success: false, error: "Unable to remove friend." });
    return;
  }
  emitFriendUpdate(req.user.id);
  emitFriendUpdate(friendId);
  res.json({ success: true });
});

app.get("/api/shared-recipes", auth.requireAuth, (req, res) => {
  const recipes = db.listSharedRecipesForUser(req.user.id);
  res.json({ success: true, recipes });
});

app.get("/api/cookbooks", auth.requireAuth, (req, res) => {
  const data = db.getLibraryForUser(req.user.id);
  res.json({ success: true, ...data });
});

app.post("/api/cookbooks", auth.requireAuth, (req, res) => {
  const { name, description, color } = req.body || {};
  if (!name || !name.trim()) {
    res.status(400).json({ success: false, error: "Name is required." });
    return;
  }
  const cookbook = db.createCookbook({
    name: name.trim(),
    description: (description || "").trim(),
    color: (color || "").trim(),
    ownerId: req.user.id,
    isDefault: false,
  });
  emitLibraryForUser(req.user.id);
  res.json({ success: true, cookbook });
});

app.put("/api/cookbooks/order", auth.requireAuth, (req, res) => {
  const cookbookIds = req.body?.cookbookIds;
  if (!Array.isArray(cookbookIds) || !db.reorderCookbooks(req.user.id, cookbookIds)) {
    res.status(400).json({ success: false, error: "Invalid cookbook order." });
    return;
  }
  const memberIds = new Set(cookbookIds.flatMap((id) => db.listCookbookMemberIds(id)));
  memberIds.forEach((id) => emitLibraryForUser(id));
  res.json({ success: true, cookbooks: db.listCookbooksForOwner(req.user.id) });
});

app.put("/api/cookbooks/:id", auth.requireAuth, (req, res) => {
  const { id } = req.params;
  const { name, description, color } = req.body || {};
  const cookbook = db.getCookbookById(id);
  if (!cookbook || !db.isCookbookManager(id, req.user.id)) {
    res.status(404).json({ success: false, error: "Cookbook not found." });
    return;
  }
  const updated = db.updateCookbook({
    ...cookbook,
    name: name?.trim?.() || cookbook.name,
    description: description?.trim?.() ?? cookbook.description,
    color: (color || "").trim(),
  });
  emitLibraryForCookbookMembers(id);
  res.json({ success: true, cookbook: updated });
});

app.delete("/api/cookbooks/:id", auth.requireAuth, (req, res) => {
  const cookbook = db.getCookbookById(req.params.id);
  const memberIds = cookbook ? db.listCookbookMemberIds(cookbook.id) : [];
  const result = db.deleteCookbook(req.params.id, req.user.id, {
    targetCookbookId: req.body?.targetCookbookId,
    deleteRecipes: req.body?.deleteRecipes === true,
  });
  if (!result.success) {
    const status = result.reason === "not-found" ? 404 : 400;
    const error = result.reason === "only-cookbook"
      ? "You cannot delete your only cookbook."
      : result.reason === "invalid-destination"
        ? "Choose a valid destination cookbook."
        : "Cookbook not found.";
    res.status(status).json({ success: false, error });
    return;
  }
  new Set([...memberIds, req.user.id]).forEach((id) => emitLibraryForUser(id));
  res.json({ success: true, cookbooks: db.listCookbooksForOwner(req.user.id) });
});

app.get("/api/cookbooks/:id/shares", auth.requireAuth, (req, res) => {
  const { id } = req.params;
  const cookbook = db.getCookbookById(id);
  if (!cookbook || cookbook.ownerId !== req.user.id) {
    res.status(404).json({ success: false, error: "Cookbook not found." });
    return;
  }
  const shares = db.listSharesForCookbook(id);
  const userShares = shares.filter((s) => s.type === "user");
  const filteredShares = userShares.filter((s) => {
    const stillFriends = db.areFriends(cookbook.ownerId, s.userId);
    if (!stillFriends) {
      db.deleteCookbookUserShare(id, s.userId);
    }
    return stillFriends;
  });
  const withNames = filteredShares.map((s) => {
    const user = db.findUserById(s.userId);
    return { ...s, username: user?.username || "Unknown" };
  });
  const publicShare = shares.find((s) => s.type === "public") || null;
  res.json({ success: true, shares: { publicShare, userShares: withNames } });
});

app.post("/api/cookbooks/:id/share/public", auth.requireAuth, (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body || {};
  const cookbook = db.getCookbookById(id);
  if (!cookbook || cookbook.ownerId !== req.user.id) {
    res.status(404).json({ success: false, error: "Cookbook not found." });
    return;
  }
  if (enabled) {
    const share = db.upsertCookbookPublicShare(id);
    res.json({ success: true, share });
  } else {
    db.removeCookbookPublicShare(id);
    res.json({ success: true, share: null });
  }
});

app.post("/api/cookbooks/:id/share/user", auth.requireAuth, (req, res) => {
  const { id } = req.params;
  const { userId, accessLevel } = req.body || {};
  const cookbook = db.getCookbookById(id);
  if (!cookbook || cookbook.ownerId !== req.user.id) {
    res.status(404).json({ success: false, error: "Cookbook not found." });
    return;
  }
  if (!userId) {
    res.status(400).json({ success: false, error: "Missing user id." });
    return;
  }
  const targetUser = db.findUserById(userId);
  if (!targetUser) {
    res.status(404).json({ success: false, error: "User not found." });
    return;
  }
  if (!db.areFriends(req.user.id, userId)) {
    res.status(400).json({ success: false, error: "You can only share cookbooks with friends." });
    return;
  }
  if (!["view", "recipes", "cookbook"].includes(accessLevel)) {
    res.status(400).json({ success: false, error: "Choose a valid sharing permission." });
    return;
  }
  const share = db.upsertCookbookUserShare(id, userId, accessLevel);
  emitLibraryForUser(userId);
  res.json({ success: true, share: { ...share, username: targetUser.username } });
});

app.delete("/api/cookbooks/:id/share/user/:userId", auth.requireAuth, (req, res) => {
  const { id, userId } = req.params;
  const cookbook = db.getCookbookById(id);
  if (!cookbook || cookbook.ownerId !== req.user.id) {
    res.status(404).json({ success: false, error: "Cookbook not found." });
    return;
  }
  db.deleteCookbookUserShare(id, userId);
  emitLibraryForUser(userId);
  res.json({ success: true });
});

app.get("/api/users", auth.requireAdmin, (req, res) => {
  res.json({ success: true, users: db.getUsers() });
});

app.delete("/api/users/:id", auth.requireAdmin, (req, res) => {
  const targetId = req.params.id;
  if (!targetId) {
    res.status(400).json({ success: false, error: "Missing user id." });
    return;
  }
  if (targetId === req.user.id) {
    res.status(400).json({ success: false, error: "You cannot remove your own account." });
    return;
  }

  const users = db.getUsers();
  const target = users.find((u) => u.id === targetId);
  if (!target) {
    res.status(404).json({ success: false, error: "User not found." });
    return;
  }

  if (target.role === "owner") {
    res.status(403).json({ success: false, error: "Cannot delete the owner." });
    return;
  }

  if (target.role === "admin" && req.user.role !== "owner") {
    res.status(403).json({ success: false, error: "Only owner can remove admins." });
    return;
  }

  const removed = db.deleteUser(targetId);
  if (!removed) {
    res.status(500).json({ success: false, error: "Unable to remove user." });
    return;
  }
  res.json({ success: true });
});

app.get("/api/recipes/:id/shares", auth.requireAuth, (req, res) => {
  const { id } = req.params;
  const recipe = db.getRecipeById(id, req.user.id);
  if (!recipe) {
    res.status(404).json({ success: false, error: "Recipe not found." });
    return;
  }
  const shares = db.listSharesForRecipe(id);
  const userShares = shares.filter((s) => s.type === "user");
  const filteredShares = userShares.filter((s) => {
    const stillFriends = db.areFriends(recipe.ownerId, s.userId);
    if (!stillFriends) {
      db.deleteUserShare(id, s.userId);
    }
    return stillFriends;
  });
  const withNames = filteredShares.map((s) => {
    const user = db.findUserById(s.userId);
    return { ...s, username: user?.username || "Unknown" };
  });
  const publicShare = shares.find((s) => s.type === "public") || null;
  res.json({ success: true, shares: { publicShare, userShares: withNames } });
});

app.post("/api/recipes/:id/share/public", auth.requireAuth, (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body || {};
  const recipe = db.getRecipeById(id, req.user.id);
  if (!recipe) {
    res.status(404).json({ success: false, error: "Recipe not found." });
    return;
  }
  if (enabled) {
    const share = db.upsertPublicShare(id);
    db.saveRecipe({ ...recipe, isPublic: true });
    res.json({ success: true, share });
  } else {
    db.removePublicShare(id);
    db.saveRecipe({ ...recipe, isPublic: false });
    res.json({ success: true, share: null });
  }
});

app.post("/api/recipes/:id/share/user", auth.requireAuth, (req, res) => {
  const { id } = req.params;
  const { userId, canEdit } = req.body || {};
  const recipe = db.getRecipeById(id, req.user.id);
  if (!recipe) {
    res.status(404).json({ success: false, error: "Recipe not found." });
    return;
  }
  if (!userId) {
    res.status(400).json({ success: false, error: "Missing user id." });
    return;
  }
  const targetUser = db.findUserById(userId);
  if (!targetUser) {
    res.status(404).json({ success: false, error: "User not found." });
    return;
  }
  if (!db.areFriends(req.user.id, userId)) {
    res.status(400).json({ success: false, error: "You can only share recipes with friends." });
    return;
  }
  const share = db.upsertUserShare(id, userId, Boolean(canEdit));
  res.json({ success: true, share: { ...share, username: targetUser.username } });
});

app.delete("/api/recipes/:id/share/user/:userId", auth.requireAuth, (req, res) => {
  const { id, userId } = req.params;
  const recipe = db.getRecipeById(id, req.user.id);
  if (!recipe) {
    res.status(404).json({ success: false, error: "Recipe not found." });
    return;
  }
  db.deleteUserShare(id, userId);
  res.json({ success: true });
});

app.get("/api/cookbook-share/:token", (req, res) => {
  const { token } = req.params;
  const share = db.getCookbookShareByToken(token);
  if (!share) {
    res.status(404).json({ success: false, error: "Share not found." });
    return;
  }
  const cookbook = db.getCookbookById(share.cookbookId);
  if (!cookbook) {
    res.status(404).json({ success: false, error: "Cookbook not found." });
    return;
  }
  const owner = db.findUserById(cookbook.ownerId);
  if (share.type === "user") {
    const isOwner = req.user && req.user.id === cookbook.ownerId;
    const isRecipient = req.user && req.user.id === share.userId;
    if (!isOwner && !isRecipient) {
      res.status(403).json({ success: false, error: "Unauthorized to view this cookbook." });
      return;
    }
    if (!isOwner && !db.areFriends(req.user.id, cookbook.ownerId)) {
      res.status(403).json({ success: false, error: "You must be friends to view this cookbook." });
      return;
    }
  }
  const recipes = db.getRecipesForCookbookIds([cookbook.id]);
  res.json({
    success: true,
    cookbook: { ...cookbook, ownerUsername: owner?.username || "" },
    recipes,
    permissions: {
      accessLevel: req.user && req.user.id === cookbook.ownerId
        ? "cookbook"
        : share.type === "user" && req.user && req.user.id === share.userId
          ? (share.accessLevel || (share.canEdit ? "cookbook" : "view"))
          : "view",
    },
  });
});

app.get("/api/share/:token", async (req, res) => {
  const { token } = req.params;
  const share = db.getShareByToken(token);
  if (!share) {
    res.status(404).json({ success: false, error: "Share not found." });
    return;
  }
  const recipe = db.getRecipeByIdAnyOwner(share.recipeId);
  if (!recipe) {
    res.status(404).json({ success: false, error: "Recipe not found." });
    return;
  }
  if (share.type === "user") {
    const isOwner = req.user && req.user.id === recipe.ownerId;
    const isRecipient = req.user && req.user.id === share.userId;
    if (!isOwner && !isRecipient) {
      res.status(403).json({ success: false, error: "Unauthorized to view this recipe." });
      return;
    }
    if (!isOwner && !db.areFriends(req.user.id, recipe.ownerId)) {
      res.status(403).json({ success: false, error: "You must be friends to view this recipe." });
      return;
    }
  }
  const hasCookbookAccess = db.hasCookbookAccess(recipe.cookbookId, req.user?.id);
  const responseRecipe = { ...recipe, isPublic: share.type === "public" || recipe.isPublic };
  if (hasCookbookAccess) {
    responseRecipe.pairings = db.getRecipePairingsForUser(recipe.id, req.user.id);
  } else {
    responseRecipe.cookbookId = "";
    responseRecipe.pairings = [];
    if (!recipe.shareHistory) responseRecipe.history = [];
  }
  res.json({
    success: true,
    recipe: responseRecipe,
    permissions: {
      canEdit:
        (req.user && req.user.id === recipe.ownerId) ||
        (Boolean(share.canEdit) && (!share.userId || (req.user && req.user.id === share.userId))),
      type: share.type,
      hasCookbookAccess,
    },
  });
});

app.put("/api/share/:token", async (req, res) => {
  const { token } = req.params;
  const share = db.getShareByToken(token);
  if (!share) {
    res.status(404).json({ success: false, error: "Share not found." });
    return;
  }
  const recipe = db.getRecipeByIdAnyOwner(share.recipeId);
  if (!recipe) {
    res.status(404).json({ success: false, error: "Recipe not found." });
    return;
  }
  const isOwner = req.user && req.user.id === recipe.ownerId;
  if (share.type === "user" && !isOwner) {
    if (!req.user || req.user.id !== share.userId) {
      res.status(403).json({ success: false, error: "You cannot edit this recipe." });
      return;
    }
    if (!db.areFriends(req.user.id, recipe.ownerId)) {
      res.status(403).json({ success: false, error: "You must be friends to edit this recipe." });
      return;
    }
  }
  const canEdit = isOwner || (Boolean(share.canEdit) && (share.userId ? req.user && req.user.id === share.userId : true));
  if (!canEdit) {
    res.status(403).json({ success: false, error: "You cannot edit this recipe." });
    return;
  }
  const normalized = normalizeRecipe({
    ...recipe,
    ...req.body,
    id: recipe.id,
    ownerId: recipe.ownerId,
    cookbookId: recipe.cookbookId,
    isPublic: recipe.isPublic,
  });
  normalized.history = historyForSave(recipe, normalized);
  const saved = db.saveRecipe(normalized);
  res.json({ success: true, recipe: saved });
  setImmediate(() => {
    emitRecipeUpdate(saved);
    if (recipe.title !== saved.title) emitPairingUpdatesForRecipe(saved);
  });
});
app.patch("/api/users/:id/role", auth.requireOwner, (req, res) => {
  const targetId = req.params.id;
  const { role } = req.body || {};
  if (!targetId || !role || !["admin", "user"].includes(role)) {
    res.status(400).json({ success: false, error: "Invalid request." });
    return;
  }
  const users = db.getUsers();
  const target = users.find((u) => u.id === targetId);
  if (!target) {
    res.status(404).json({ success: false, error: "User not found." });
    return;
  }
  if (target.role === "owner") {
    res.status(403).json({ success: false, error: "Cannot change owner role." });
    return;
  }
  const updated = db.updateUserRole(targetId, role);
  if (!updated) {
    res.status(500).json({ success: false, error: "Unable to update role." });
    return;
  }
  res.json({ success: true });
});

app.get("/api/join-codes", auth.requireAdmin, (req, res) => {
  res.json({ success: true, joinCodes: db.listJoinCodes() });
});

app.post("/api/join-codes", auth.requireAdmin, (req, res) => {
  const { role, expiresAt, maxUses } = req.body || {};
  if (!role || !["user", "admin"].includes(role)) {
    res.status(400).json({ success: false, error: "Invalid role for join code." });
    return;
  }
  if (role === "admin" && req.user.role !== "owner") {
    res.status(403).json({ success: false, error: "Only the owner can create admin join codes." });
    return;
  }
  const parsedMaxUses = Number(maxUses) || 1;
  const safeMaxUses = parsedMaxUses < 1 ? 1 : Math.min(parsedMaxUses, 50);
  let expiresIso = null;
  if (expiresAt) {
    const parsed = new Date(expiresAt);
    if (!Number.isNaN(parsed.getTime())) {
      expiresIso = parsed.toISOString();
    }
  }
  const code = db.createJoinCode({ role, createdBy: req.user.id, expiresAt: expiresIso, maxUses: safeMaxUses });
  res.json({ success: true, code });
});

app.delete("/api/join-codes/:code", auth.requireAdmin, (req, res) => {
  const { code } = req.params;
  const normalized = db.normalizeJoinCode(code);
  if (!normalized) {
    res.status(400).json({ success: false, error: "Invalid code." });
    return;
  }
  db.deleteJoinCode(normalized);
  res.json({ success: true });
});

io.use(auth.socketAuth);

io.on("connection", (socket) => {
  const user = socket.data.user;
  socket.join(`user:${user.id}`);

  socket.on("library:list", (ack) => {
    if (typeof ack === "function") {
      ack({ success: true, data: db.getLibraryForUser(user.id) });
    }
  });

  socket.on("recipes:list", (ack) => {
    if (typeof ack === "function") {
      ack({ success: true, data: db.getLibraryForUser(user.id) });
    }
  });

  socket.on("recipe:save", (payload, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    const incoming = payload || {};

    if (!incoming.title) {
      reply({ success: false, error: "Title is required." });
      return;
    }

    const normalized = normalizeRecipe(incoming);
    const existing = normalized.id ? db.getRecipeByIdAnyOwner(normalized.id) : null;
    const previousCookbookId = existing?.cookbookId || null;
    const incomingCookbookId = normalized.cookbookId || db.getDefaultCookbookForOwner(user.id)?.id;
    let cookbook = incomingCookbookId ? db.getCookbookById(incomingCookbookId) : null;
    if (!cookbook) {
      cookbook = db.ensureDefaultCookbookForUser(user);
    }
    if (!cookbook) {
      reply({ success: false, error: "Cookbook not found." });
      return;
    }
    if (existing && previousCookbookId !== cookbook.id) {
      const previousCookbook = db.getCookbookById(previousCookbookId);
      const canMoveRecipe = previousCookbook?.ownerId === user.id
        && db.isCookbookManager(cookbook.id, user.id);
      if (!canMoveRecipe) {
        reply({ success: false, error: "Only the cookbook owner can move this recipe to another cookbook." });
        return;
      }
    }
    const canEditCookbook = existing
      ? db.isCookbookEditor(cookbook.id, user.id)
      : db.isCookbookManager(cookbook.id, user.id);
    if (!canEditCookbook) {
      reply({ success: false, error: "You do not have permission to edit this cookbook." });
      return;
    }

    normalized.ownerId = cookbook.ownerId;
    normalized.cookbookId = cookbook.id;
    if (!normalized.author) {
      normalized.author = user.username || "";
    }
    normalized.history = historyForSave(existing, normalized);
    normalized.shareHistory = existing?.shareHistory ?? normalized.shareHistory;
    const saved = db.saveRecipe(normalized);

    // Acknowledge the write before generating full library payloads for every
    // connected member. This keeps save latency independent of library size.
    reply({ success: true, data: saved });
    setImmediate(() => {
      emitRecipeUpdate(saved, previousCookbookId);
      if (existing?.title !== saved.title) emitPairingUpdatesForRecipe(saved);
    });
  });

  socket.on("recipe:get", (id, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    if (!id) {
      reply({ success: false, error: "Missing recipe id." });
      return;
    }
    const recipe = db.getRecipeForUser(id, user.id);
    if (!recipe) {
      reply({ success: false, error: "Recipe not found." });
      return;
    }
    reply({ success: true, data: recipe });
  });

  socket.on("recipe:make:save", ({ recipeId, id, notes } = {}, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    const recipe = db.getRecipeForUser(recipeId, user.id);
    if (!recipe) return reply({ success: false, error: "Recipe not found." });
    if (!db.isCookbookEditor(recipe.cookbookId, user.id)) {
      return reply({ success: false, error: "You do not have permission to add makes to this recipe." });
    }
    const now = new Date().toISOString();
    const event = id ? recipe.history?.find((item) => item.id === id && item.type === "make") : null;
    if (id && !event) return reply({ success: false, error: "Make not found." });
    const nextEvent = event
      ? { ...event, notes: (notes || "").trim(), updatedAt: now }
      : { id: crypto.randomUUID(), type: "make", createdAt: now, notes: (notes || "").trim() };
    const history = event
      ? recipe.history.map((item) => item.id === id ? nextEvent : item)
      : [nextEvent, ...(recipe.history || [])];
    const saved = db.saveRecipe({ ...recipe, history });
    reply({ success: true, data: saved });
    setImmediate(() => emitRecipeUpdate(saved));
  });

  socket.on("recipe:make:delete", ({ recipeId, eventId } = {}, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    const recipe = db.getRecipeForUser(recipeId, user.id);
    if (!recipe) return reply({ success: false, error: "Recipe not found." });
    if (!db.isCookbookEditor(recipe.cookbookId, user.id)) {
      return reply({ success: false, error: "You do not have permission to delete recipe makes." });
    }
    const event = recipe.history?.find((item) => item.id === eventId && item.type === "make");
    if (!event) return reply({ success: false, error: "Recipe make not found." });
    const saved = db.saveRecipe({ ...recipe, history: recipe.history.filter((item) => item.id !== eventId) });
    reply({ success: true, data: saved });
    setImmediate(() => emitRecipeUpdate(saved));
  });

  socket.on("recipe:history:edit:delete", ({ recipeId, eventId } = {}, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    const recipe = db.getRecipeForUser(recipeId, user.id);
    if (!recipe) return reply({ success: false, error: "Recipe not found." });
    if (!db.isCookbookEditor(recipe.cookbookId, user.id)) {
      return reply({ success: false, error: "You do not have permission to delete recipe edits." });
    }
    const event = recipe.history?.find((item) => item.id === eventId && item.type === "edit");
    if (!event) return reply({ success: false, error: "Recipe edit not found." });
    const saved = db.saveRecipe({ ...recipe, history: recipe.history.filter((item) => item.id !== eventId) });
    reply({ success: true, data: saved });
    setImmediate(() => emitRecipeUpdate(saved));
  });

  socket.on("recipe:delete", (id, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    if (!id) {
      reply({ success: false, error: "Missing recipe id." });
      return;
    }
    const recipe = db.getRecipeByIdAnyOwner(id);
    if (!recipe) {
      reply({ success: false, error: "Recipe not found." });
      return;
    }
    const canManageCookbook = db.isCookbookManager(recipe.cookbookId, user.id);
    if (!canManageCookbook) {
      reply({ success: false, error: "You do not have permission to delete this recipe." });
      return;
    }
    const removed = db.deleteRecipe(id, recipe.ownerId);
    if (!removed) {
      reply({ success: false, error: "Recipe not found." });
      return;
    }
    reply({ success: true });
    setImmediate(() => emitRecipeRemoval(recipe));
  });

  socket.on("recipe:pair", ({ recipeId, pairedRecipeId } = {}, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    if (!recipeId || !pairedRecipeId || recipeId === pairedRecipeId) {
      reply({ success: false, error: "Choose a different recipe to pair." });
      return;
    }
    const recipe = db.getRecipeForUser(recipeId, user.id);
    const pairedRecipe = db.getRecipeForUser(pairedRecipeId, user.id);
    if (!recipe || !pairedRecipe) {
      reply({ success: false, error: "Recipe not found." });
      return;
    }
    if (!db.isCookbookEditor(recipe.cookbookId, user.id)) {
      reply({ success: false, error: "You do not have permission to add pairings to this recipe." });
      return;
    }
    db.addRecipePairing(recipeId, pairedRecipeId);
    reply({ success: true });
    setImmediate(() => {
      const memberIds = new Set([
        ...db.listCookbookMemberIds(recipe.cookbookId),
        ...db.listCookbookMemberIds(pairedRecipe.cookbookId),
      ]);
      memberIds.forEach((memberId) => {
        io.to(`user:${memberId}`).emit("recipe:pairing-updated", { recipeIds: [recipeId, pairedRecipeId] });
      });
    });
  });

  socket.on("recipe:unpair", ({ recipeId, pairedRecipeId } = {}, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    if (!recipeId || !pairedRecipeId || recipeId === pairedRecipeId) {
      reply({ success: false, error: "Invalid recipe pairing." });
      return;
    }
    const recipe = db.getRecipeForUser(recipeId, user.id);
    const pairedRecipe = db.getRecipeForUser(pairedRecipeId, user.id);
    if (!recipe || !pairedRecipe) {
      reply({ success: false, error: "Recipe not found." });
      return;
    }
    if (!db.isCookbookEditor(recipe.cookbookId, user.id)) {
      reply({ success: false, error: "You do not have permission to remove pairings from this recipe." });
      return;
    }
    db.removeRecipePairing(recipeId, pairedRecipeId);
    reply({ success: true });
    setImmediate(() => {
      const memberIds = new Set([
        ...db.listCookbookMemberIds(recipe.cookbookId),
        ...db.listCookbookMemberIds(pairedRecipe.cookbookId),
      ]);
      memberIds.forEach((memberId) => {
        io.to(`user:${memberId}`).emit("recipe:pairing-updated", { recipeIds: [recipeId, pairedRecipeId] });
      });
    });
  });
});

app.post("/api/recipes/:id/share/history", auth.requireAuth, (req, res) => {
  const { id } = req.params;
  const recipe = db.getRecipeById(id, req.user.id);
  if (!recipe) {
    res.status(404).json({ success: false, error: "Recipe not found." });
    return;
  }
  const saved = db.saveRecipe({ ...recipe, shareHistory: Boolean(req.body?.enabled) });
  res.json({ success: true, shareHistory: saved.shareHistory });
});

app.get("/{*splat}", (req, res) => {
  if (fs.existsSync(indexHtmlPath)) {
    res.sendFile(indexHtmlPath);
  } else {
    res.status(503).send("Client build not found. Please run `npm run build`.");
  }
});

server.listen(PORT, () => {
  console.log(`Server ready at http://localhost:${PORT}`);
  db.ensureOwnerJoinCode();
});
