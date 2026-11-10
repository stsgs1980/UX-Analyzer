/**
 * Extract JSON from potentially markdown-wrapped LLM response.
 * Handles: raw JSON, ```json blocks, ``` blocks, text before/after braces.
 */
export function extractJson(text: string): string {
  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }
  return jsonStr;
}

/**
 * Close a truncated JSON document: dangling string + unclosed brackets.
 * Returns null when the text cannot be repaired into valid JSON.
 */
export function repairTruncatedJson(jsonStr: string): string | null {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const char of jsonStr) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === '{' || char === '[') {
      stack.push(char);
    } else if (char === '}' || char === ']') {
      stack.pop();
    }
  }

  if (stack.length === 0 && !inString) {
    return null; // nothing to repair
  }

  let repaired = jsonStr;
  if (inString) {
    // A trailing backslash would escape the closing quote - drop it.
    if (repaired.endsWith('\\')) repaired = repaired.slice(0, -1);
    repaired += '"';
  }
  while (stack.length > 0) {
    const open = stack.pop()!;
    repaired += open === '{' ? '}' : ']';
  }

  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
  }
}

/**
 * Parse JSON from an LLM response, repairing it when the model was cut off
 * mid-document (token limit reached).
 */
export function parseJsonWithRepair(text: string): {
  data: Record<string, unknown> | null;
  repaired: boolean;
} {
  const jsonStr = extractJson(text);
  try {
    return { data: JSON.parse(jsonStr) as Record<string, unknown>, repaired: false };
  } catch {
    const repaired = repairTruncatedJson(jsonStr);
    if (repaired) {
      try {
        return { data: JSON.parse(repaired) as Record<string, unknown>, repaired: true };
      } catch {
        return { data: null, repaired: false };
      }
    }
    return { data: null, repaired: false };
  }
}
