import crypto from "node:crypto";
import { UNIT_VALUES, normalizeUnit } from "./src/mixins/units.js";
const DEFAULT_MODEL = "GPT-OSS-20B";

const usesResponsesApi = (endpoint) => {
  try {
    return /\/responses\/?$/i.test(new URL(endpoint).pathname);
  } catch {
    return false;
  }
};

const responseText = (data) => {
  if (typeof data?.output_text === "string") return data.output_text;
  return (data?.output || [])
    .flatMap((item) => item?.content || [])
    .filter((item) => item?.type === "output_text")
    .map((item) => item.text || "")
    .join("");
};

const requestLlm = async (endpoint, body, { timeoutMs, apiKey } = {}) => {
  const targetEndpoint = (endpoint || "").trim();
  if (!targetEndpoint) throw new Error("LLM endpoint not configured.");

  let response;
  try {
    response = await fetch(targetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
    });
  } catch (error) {
    if (error?.name === "TimeoutError") {
      throw new Error("LLM endpoint test timed out.");
    }
    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error?.message || `LLM request failed with status ${response.status}`);
  }

  return response.json();
};

const SYSTEM_PROMPT = `You are a careful recipe extraction assistant.
From the user's provided text and/or image, return ONLY valid JSON with this shape:
{
  "title": string,
  "description": string,
  "author": string,
  "tags": string[],
  "ingredients": [{ "name": string, "quantity": string, "unit": string }],
  "steps": string[],
  "notes": string,
  "servingsQuantity": string,
  "servingsUnit": string
}
Rules:
- Include ALL ingredients you can find; do not omit items. If many exist, include them all.
- Include ALL preparation steps in the original order; short, direct instructions.
- Fill "quantity" and "unit" when possible; if unknown, keep them as empty strings.
- Standardized ingredients (remove brand names, etc.)
- If there is no title or description provided, choose one
- Provide 3-4 concise tags focused on meal type and main ingredients (e.g., "dinner", "dessert", "pumpkin", "chicken", "pasta"); omit dietary labels unless given.
- Units must be chosen ONLY from this list: ${JSON.stringify(UNIT_VALUES)}. Convert close variants (cups, tablespoons, tsp., etc.) to the closest allowed unit. If you cannot map it, leave unit as an empty string.
- Express customary measurements as simple fractions where applicable (e.g., 1/2, 1/3, 1/4, 3/4).
- Put any additional cook's guidance, substitutions, or reminders into "notes".
- If a serving size is present, return the numeric/text value in "servingsQuantity" (e.g., "4", "4-6") and the accompanying text in "servingsUnit" (e.g., "servings", "people", "cups"). If you cannot find one, leave them as empty strings.
- Use empty strings/arrays when something is missing.
- Do NOT add extra fields beyond the JSON shape. Respond with JSON only, no prose.`;

const jsonFromText = (text) => {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/({[\s\S]*})/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return {};
      }
    }
    return {};
  }
};

const arrayFrom = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value.split(/[\n,]+/).map((item) => item.trim());
  }
  return [];
};

const normalizeIngredient = (item) => {
  const sentenceCase = (value) => {
    const str = (value || "").toString().trim();
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const base =
    typeof item === "string"
      ? { name: item.trim(), quantity: "", unit: "" }
      : {
          name: item?.name?.trim() || "",
          quantity: (item?.quantity ?? "").toString().trim(),
          unit: item?.unit?.trim() || "",
        };

  return {
    id: item?.id || crypto.randomUUID(),
    name: sentenceCase(base.name),
    quantity: base.quantity,
    unit: normalizeUnit(base.unit),
  };
};

const normalizeIngredients = (value) =>
  arrayFrom(value)
    .map((item) => normalizeIngredient(item))
    .filter((item) => item.name || item.quantity || item.unit);

const normalizeSteps = (value) =>
  arrayFrom(value)
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const candidate =
          item.step ?? item.text ?? item.description ?? item.instruction ?? item.content ?? item.name ?? "";
        return typeof candidate === "string" ? candidate.trim() : "";
      }
      return "";
    })
    .filter(Boolean);

const normalizeRecipe = (payload) => {
  const data = payload || {};
  const steps = normalizeSteps(data.steps);
  const ingredients = normalizeIngredients(data.ingredients);
  const servings = data.servings || {};
  const tags = arrayFrom(data.tags)
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean)
    .slice(0, 4);

  return {
    title: data.title?.trim() || "",
    description: data.description?.trim() || "",
    author: data.author?.trim() || "",
    tags,
    ingredients,
    steps: steps.map((step) => step.trim()).filter(Boolean),
    notes: data.notes?.toString?.().trim() || "",
    servingsQuantity:
      data.servingsQuantity?.toString?.().trim() ||
      servings?.quantity?.toString?.().trim() ||
      (typeof servings === "string" ? servings.trim() : ""),
    servingsUnit: data.servingsUnit?.toString?.().trim() || servings?.unit?.toString?.().trim() || "",
  };
};

export const buildRecipeFromText = async (
  text,
  { endpoint, apiKey, model, imageBase64 } = {},
) => {
  if (!text?.trim() && !imageBase64) throw new Error("No recipe content provided for import.");
  const input = text?.trim()
    ? `Extract the recipe details from this content. Respond with JSON only.\n\n${text.trim()}`
    : "Extract the recipe details from this image. Respond with JSON only.";
  const responsesApi = usesResponsesApi(endpoint);
  const body = responsesApi
    ? {
        model: model || DEFAULT_MODEL,
        instructions: SYSTEM_PROMPT,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: input },
              ...(imageBase64
                ? [{ type: "input_image", image_url: imageBase64, detail: "high" }]
                : []),
            ],
          },
        ],
        max_output_tokens: 2000,
        store: false,
        text: { format: { type: "json_object" } },
      }
    : {
        model: model || DEFAULT_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: imageBase64
              ? [
                  { type: "text", text: input },
                  { type: "image_url", image_url: { url: imageBase64, detail: "high" } },
                ]
              : input,
          },
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      };
  const data = await requestLlm(endpoint, body, { apiKey });

  const content = responsesApi
    ? responseText(data)
    : data?.choices?.[0]?.message?.content ?? "";
  const parsed = jsonFromText(content);
  return {
    recipe: normalizeRecipe(parsed),
    usage: {
      inputTokens: Number(
        responsesApi ? data?.usage?.input_tokens : data?.usage?.prompt_tokens,
      ) || 0,
      outputTokens: Number(
        responsesApi ? data?.usage?.output_tokens : data?.usage?.completion_tokens,
      ) || 0,
    },
  };
};

export const testLlmEndpoint = async (endpoint, { apiKey, model } = {}) => {
  const startedAt = Date.now();
  const responsesApi = usesResponsesApi(endpoint);
  const data = await requestLlm(
    endpoint,
    responsesApi
      ? {
          model: model || DEFAULT_MODEL,
          input: "Reply with OK.",
          max_output_tokens: 128,
          store: false,
        }
      : {
          model: model || DEFAULT_MODEL,
          messages: [{ role: "user", content: "Reply with OK." }],
          temperature: 0,
          max_tokens: 8,
        },
    { timeoutMs: 15000, apiKey },
  );

  if (responsesApi ? !responseText(data) : !data?.choices?.[0]?.message) {
    throw new Error("LLM endpoint returned an unexpected response.");
  }

  return { latencyMs: Date.now() - startedAt };
};

export const listLlmModels = async (endpoint, { apiKey } = {}) => {
  const targetEndpoint = (endpoint || "").trim();
  if (!targetEndpoint) throw new Error("LLM endpoint not configured.");

  const modelsUrl = new URL(targetEndpoint);
  const trimmedPath = modelsUrl.pathname.replace(/\/+$/, "");
  modelsUrl.pathname = /\/(chat\/completions|responses)$/i.test(trimmedPath)
    ? trimmedPath.replace(/\/(chat\/completions|responses)$/i, "/models")
    : `${trimmedPath}/models`;
  modelsUrl.search = "";
  modelsUrl.hash = "";

  const response = await fetch(modelsUrl, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error?.message || `Models request failed with status ${response.status}`);
  }

  const data = await response.json();
  return (Array.isArray(data?.data) ? data.data : [])
    .map((item) => (typeof item === "string" ? item : item?.id))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
};
