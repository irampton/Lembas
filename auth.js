import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import * as db from "./db.js";

export const SESSION_COOKIE_NAME = "sid";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export const sanitizeUser = (user) =>
  user
    ? {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        role: user.role,
        createdAt: user.createdAt,
      }
    : null;

export const parseCookies = (header) =>
  (header || "")
    .split(";")
    .map((part) => part.trim().split("="))
    .filter(([k]) => k)
    .reduce((acc, [k, v]) => {
      acc[k] = decodeURIComponent(v || "");
      return acc;
    }, {});

export const getSessionIdFromCookies = (cookieHeader) => {
  const cookies = parseCookies(cookieHeader || "");
  return cookies[SESSION_COOKIE_NAME];
};

export const setSessionCookie = (res, sessionId, ttlMs = SESSION_TTL_MS) => {
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: ttlMs,
    path: "/",
  });
};

export const clearSessionCookie = (res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
};

export const attachSession = (req, res, next) => {
  const sid = getSessionIdFromCookies(req.headers.cookie);
  if (sid) {
    const session = db.getSessionWithUser(sid);
    if (session?.user) {
      req.user = session.user;
      req.sessionId = sid;
    }
  }
  next();
};

export const requireAuth = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "owner")) {
    res.status(403).json({ success: false, error: "Forbidden." });
    return;
  }
  next();
};

export const requireOwner = (req, res, next) => {
  if (!req.user || req.user.role !== "owner") {
    res.status(403).json({ success: false, error: "Forbidden." });
    return;
  }
  next();
};

const createSessionForUser = (userId, res) => {
  const session = db.createSession(userId, SESSION_TTL_MS);
  setSessionCookie(res, session.id);
  return session;
};

export const signupHandler = async (req, res) => {
  const { username, password, joinCode } = req.body || {};
  const trimmedUsername = (username || "").trim().toLowerCase();
  const normalizedCode = db.normalizeJoinCode(joinCode);

  if (!/^[\x21-\x7E]{1,24}$/.test(trimmedUsername) || !password || password.length < 8) {
    res.status(400).json({ success: false, error: "Username must be 1–24 ASCII characters with no spaces, and the password must be at least 8 characters." });
    return;
  }

  if (!normalizedCode || normalizedCode.length !== 7) {
    res.status(400).json({ success: false, error: "Invalid join code." });
    return;
  }

  const codeRecord = db.consumeJoinCode(normalizedCode);
  if (!codeRecord) {
    res.status(400).json({ success: false, error: "Join code is invalid or already used." });
    return;
  }

  if (db.findUserByUsername(trimmedUsername)) {
    res.status(409).json({ success: false, error: "Username already taken." });
    return;
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();

  const user = db.createUser({
    id,
    username: trimmedUsername,
    displayName: trimmedUsername,
    passwordHash,
    role: codeRecord.role,
    createdAt: now,
  });
  db.ensureDefaultCookbookForUser(user);

  db.markJoinCodeUsed(normalizedCode, id);
  if (codeRecord.role === "owner") {
    db.deleteOwnerJoinCodes();
  }

  createSessionForUser(user.id, res);
  res.json({ success: true, user: sanitizeUser(user) });
};

export const updateProfileHandler = (req, res) => {
  const username = (req.body?.username || "").trim().toLowerCase();
  const displayName = (req.body?.displayName || "").trim();

  if (!/^[\x21-\x7E]{1,24}$/.test(username)) {
    res.status(400).json({ success: false, error: "Username must be 1–24 ASCII characters with no spaces." });
    return;
  }
  if (!displayName || Array.from(displayName).length > 24) {
    res.status(400).json({ success: false, error: "Display name must be between 1 and 24 characters." });
    return;
  }

  const existing = db.findUserByUsername(username);
  if (existing && existing.id !== req.user.id) {
    res.status(409).json({ success: false, error: "Username already taken." });
    return;
  }

  try {
    const user = db.updateUserProfile(req.user.id, { username, displayName });
    if (!user) {
      res.status(404).json({ success: false, error: "User not found." });
      return;
    }
    res.json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    if (error?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      res.status(409).json({ success: false, error: "Username already taken." });
      return;
    }
    console.error("[profile] Unable to update profile:", error);
    res.status(500).json({ success: false, error: "Unable to update profile." });
  }
};

export const loginHandler = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ success: false, error: "Username and password are required." });
    return;
  }
  const user = db.findUserByUsername(username.trim());
  if (!user) {
    res.status(401).json({ success: false, error: "Invalid credentials." });
    return;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ success: false, error: "Invalid credentials." });
    return;
  }
  db.purgeUserSessions(user.id);
  createSessionForUser(user.id, res);
  res.json({ success: true, user: sanitizeUser(user) });
};

export const logoutHandler = (req, res) => {
  if (req.sessionId) {
    db.deleteSession(req.sessionId);
  }
  clearSessionCookie(res);
  res.json({ success: true });
};

export const meHandler = (req, res) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }
  res.json({ success: true, user: sanitizeUser(req.user) });
};

export const socketAuth = (socket, next) => {
  const sid = getSessionIdFromCookies(socket.request.headers.cookie || "");
  const session = db.getSessionWithUser(sid);
  if (!session?.user) {
    return next(new Error("unauthorized"));
  }
  socket.data.user = session.user;
  socket.data.sessionId = sid;
  next();
};
