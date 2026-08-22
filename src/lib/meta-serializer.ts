/**
 * Unified metadata serializer & parser for embedded JSON comment tags (<!--meta:...-->).
 * Provides robust error handling, clean string sanitization, and type safety.
 */

const META_REGEX = /<!--meta:(.*?)-->/;
const META_GLOBAL_REGEX = /<!--meta:.*?-->/g;

/**
 * Extracts embedded metadata and returns clean text alongside the parsed metadata object.
 */
export function extractMetadata<T = Record<string, unknown>>(
  rawText: string | null | undefined,
): { cleanText: string; metadata: T | null } {
  if (!rawText || typeof rawText !== "string") {
    return { cleanText: "", metadata: null };
  }

  const match = rawText.match(META_REGEX);
  let metadata: T | null = null;

  if (match && match[1]) {
    try {
      metadata = JSON.parse(match[1]) as T;
    } catch {
      metadata = null;
    }
  }

  const cleanText = rawText.replace(META_GLOBAL_REGEX, "").trim();
  return { cleanText, metadata };
}

/**
 * Strips all <!--meta:...--> comments from a text string.
 */
export function stripMetadata(rawText: string | null | undefined): string {
  if (!rawText || typeof rawText !== "string") return "";
  return rawText.replace(META_GLOBAL_REGEX, "").trim();
}

/**
 * Embeds metadata into a target string as an HTML comment (<!--meta:...-->).
 */
export function embedMetadata<T = Record<string, unknown>>(
  baseText: string | null | undefined,
  metadata: T,
): string {
  const clean = stripMetadata(baseText);
  if (!metadata || (typeof metadata === "object" && Object.keys(metadata).length === 0)) {
    return clean;
  }
  const tag = `<!--meta:${JSON.stringify(metadata)}-->`;
  return clean ? `${clean} ${tag}`.trim() : tag;
}

/**
 * Merges partial metadata into an existing string's metadata tag.
 */
export function mergeMetadata<T extends Record<string, unknown>>(
  rawText: string | null | undefined,
  partialMeta: Partial<T>,
): string {
  const { cleanText, metadata } = extractMetadata<T>(rawText);
  const updatedMeta = { ...(metadata || {}), ...partialMeta } as T;
  return embedMetadata(cleanText, updatedMeta);
}
