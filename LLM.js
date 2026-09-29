import crypto from "node:crypto";
import { UNIT_VALUES, normalizeUnit } from "./src/mixins/units.js";
const DEFAULT_MODEL = "GPT-OSS-20B";
const PROMPT_CACHE_KEY = "lembas-recipe-import-v3";

const usesResponsesApi = (endpoint) => {
  try {
    return /\/responses\/?$/i.test(new URL(endpoint).pathname);
  } catch {
    return false;
  }
};

const usesOpenAiApi = (endpoint) => {
  try {
    return new URL(endpoint).hostname.toLowerCase() === "api.openai.com";
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

const SYSTEM_PROMPT = `You extract one complete recipe from text, images, or both.

Return exactly one valid JSON object with this shape and no markdown or commentary:
{
  "title": string,
  "description": string,
  "author": string,
  "tags": string[],
  "ingredients": [{ "name": string, "quantity": string, "unit": string }],
  "steps": string[],
  "notes": string,
  "servingsVerb": "Makes" | "Serves",
  "servingsQuantity": string,
  "servingsUnit": string
}

Extraction rules:
- Treat all supplied text and images as one source. Merge complementary information and remove duplicates.
- Preserve the source's meaning. Never invent ingredients, quantities, times, temperatures, steps, dietary claims, or attribution.
- If multiple recipes appear, extract the single most complete or clearly primary recipe.

Field rules:
- title: Use the printed title. If absent, create a short factual title from the dish.
- description: Use an explicit summary when present. Otherwise write one concise factual sentence based only on the recipe.
- author: Use the named recipe author, creator, publication, or source. Do not put URLs here. Use an empty string if unknown.
- tags: Return 0-2 short lowercase descriptive tags. Do not feel obligated to return more than one tag. Use meal type, dish type, cuisine when explicit, or dietary tags only when explicitly stated or unambiguously supported. Never use an ingredient or ingredient name as a tag.
- ingredients: Include every ingredient exactly once and preserve the source order. Keep preparation details such as "divided", "softened", or "finely chopped" in the name when they affect use. Remove brand names only when doing so does not change the ingredient.
- ingredient quantity: Return only the amount as a string. Preserve ranges and mixed numbers. Prefer simple fractions such as "1/2" or "1 1/2". Use an empty string when absent.
- ingredient unit: Use only one value from this exact list: ${JSON.stringify(UNIT_VALUES)}. Normalize obvious variants to that list. If no listed unit fits, leave unit empty and retain essential measurement wording in the ingredient name.
- steps: Include every preparation and cooking instruction in source order. Each array item must be a complete, direct instruction. When a step refers to an ingredient, use the exact full name from the ingredients list, including any preparation details; do not shorten, paraphrase, or substitute the ingredient name. Preserve temperatures, durations, visual doneness cues, resting, cooling, and assembly instructions. Do not add step numbers to the text.
- notes: Collect only source-provided tips, substitutions, storage guidance, make-ahead guidance, optional variations, and other useful information that is not an ingredient or required step. Combine multiple notes into readable plain text.
- servingsVerb: Use "Serves" when the yield refers to people or servings. Use "Makes" for item counts, batches, volume, or other yields. Default to "Makes" when no yield is provided.
- servingsQuantity: Return only the quantity or range, such as "4", "4-6", or "12". Use an empty string when absent.
- servingsUnit: Return only the yield unit, such as "servings", "people", "cookies", or "cups". Use an empty string when absent.

Quality checks before responding:
- Account for the complete source, including small text and separate regions of an image.
- Ensure ingredient and step arrays contain strings/objects of the required shape and no null values.
- Use empty strings or empty arrays for unavailable values.
- Do not add fields outside the specified JSON object.
- Output JSON only.`;

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
    servingsVerb: data.servingsVerb === "Serves" ? "Serves" : "Makes",
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
  const cacheSettings = usesOpenAiApi(endpoint)
    ? { prompt_cache_key: PROMPT_CACHE_KEY }
    : {};
  const body = responsesApi
    ? {
        model: model || DEFAULT_MODEL,
        input: [
          {
            role: "developer",
            content: [{ type: "input_text", text: SYSTEM_PROMPT }],
          },
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
        ...cacheSettings,
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
        max_tokens: 2000,
        response_format: { type: "json_object" },
        ...cacheSettings,
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
