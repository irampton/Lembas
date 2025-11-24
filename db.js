import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || "./lembas.db";
const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.join(__dirname, dbPath);

const db = new Database(resolvedDbPath);
db.pragma("journal_mode = WAL");

db.prepare(`
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    author TEXT DEFAULT '',
    createdAt TEXT NOT NULL,
    tags TEXT DEFAULT '[]',
    ingredients TEXT DEFAULT '[]',
    steps TEXT DEFAULT '[]',
    ownerId TEXT DEFAULT '',
    isPublic INTEGER DEFAULT 0,
    notes TEXT DEFAULT ''
  )
`).run();

const selectAllStmt = db.prepare("SELECT * FROM recipes ORDER BY title COLLATE NOCASE");
const selectOneStmt = db.prepare("SELECT * FROM recipes WHERE id = ?");
const upsertStmt = db.prepare(`
  INSERT INTO recipes (id, title, description, author, createdAt, tags, ingredients, steps, ownerId, isPublic, notes)
  VALUES (@id, @title, @description, @author, @createdAt, @tags, @ingredients, @steps, @ownerId, @isPublic, @notes)
  ON CONFLICT(id) DO UPDATE SET
    title=excluded.title,
    description=excluded.description,
    author=excluded.author,
    createdAt=excluded.createdAt,
    tags=excluded.tags,
    ingredients=excluded.ingredients,
    steps=excluded.steps,
    ownerId=excluded.ownerId,
    isPublic=excluded.isPublic,
    notes=excluded.notes
`);
const deleteStmt = db.prepare("DELETE FROM recipes WHERE id = ?");

const parseJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const rowToRecipe = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description || "",
  author: row.author || "",
  createdAt: row.createdAt,
  tags: parseJson(row.tags, []),
  ingredients: parseJson(row.ingredients, []),
  steps: parseJson(row.steps, []),
  ownerId: row.ownerId || "",
  isPublic: Boolean(row.isPublic),
  notes: row.notes || "",
});

const serializeRecipe = (recipe) => ({
  id: recipe.id,
  title: recipe.title,
  description: recipe.description ?? "",
  author: recipe.author ?? "",
  createdAt: recipe.createdAt,
  tags: JSON.stringify(recipe.tags ?? []),
  ingredients: JSON.stringify(recipe.ingredients ?? []),
  steps: JSON.stringify(recipe.steps ?? []),
  ownerId: recipe.ownerId ?? "",
  isPublic: recipe.isPublic ? 1 : 0,
  notes: recipe.notes ?? "",
});

export const getRecipes = () => selectAllStmt.all().map(rowToRecipe);

export const getRecipeById = (id) => {
  const row = selectOneStmt.get(id);
  return row ? rowToRecipe(row) : null;
};

export const saveRecipe = (recipe) => {
  upsertStmt.run(serializeRecipe(recipe));
  return getRecipeById(recipe.id);
};

export const deleteRecipe = (id) => {
  const info = deleteStmt.run(id);
  return info.changes > 0;
};
