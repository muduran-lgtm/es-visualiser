/**
 * Utility to sanitize and mask sensitive credentials, API keys, tokens, and passwords
 * from error messages, API responses, and execution states.
 */

export function maskToken(val: string): string {
  if (!val || typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (trimmed.length <= 6) return '••••••';
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

export function sanitizeSensitiveString(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let result = text;

  // Mask "API key id [xyz]" or "API key [xyz]" (Elasticsearch security exception format)
  result = result.replace(/(\bAPI\s+key(?:\s+id)?\s*\[)([^\]]+)(\])/gi, (_match, p1, p2, p3) => {
    return `${p1}${maskToken(p2)}${p3}`;
  });

  // Mask "API key 'xyz'" or 'API key "xyz"'
  result = result.replace(/(\bAPI\s+key(?:\s+id)?\s*['"])([^'"]+)(['"])/gi, (_match, p1, p2, p3) => {
    return `${p1}${maskToken(p2)}${p3}`;
  });

  // Mask "api_key": "xyz" or "apiKey": "xyz" or apiKey: xyz
  result = result.replace(/((?:['"]?(?:api[_-]?key|access[_-]?token|secret[_-]?key|client[_-]?secret)['"]?)\s*[:=]\s*['"]?)([^'",\s\]}]+)(['"]?)/gi, (_match, p1, p2, p3) => {
    return `${p1}${maskToken(p2)}${p3}`;
  });

  // Mask "Authorization: ApiKey xyz" or "ApiKey xyz"
  result = result.replace(/(\bApiKey\s+)([a-zA-Z0-9_\-+/=]{8,})/gi, (_match, p1, p2) => {
    return `${p1}${maskToken(p2)}`;
  });

  // Mask "Bearer xyz"
  result = result.replace(/(\bBearer\s+)([a-zA-Z0-9_\-\.=]{8,})/gi, (_match, p1, p2) => {
    return `${p1}${maskToken(p2)}`;
  });

  // Mask password or secret fields: "password": "xyz" or password: xyz
  result = result.replace(/((?:['"]?(?:password|passwd|secret)['"]?)\s*[:=]\s*['"]?)([^'",\s\]}]+)(['"]?)/gi, (_match, p1, _p2, p3) => {
    return `${p1}••••••••${p3}`;
  });

  // Mask GitHub PATs
  result = result.replace(/github_pat_[a-zA-Z0-9_]{20,}/gi, (match) => {
    return `github_pat_••••${match.slice(-4)}`;
  });

  return result;
}

export function sanitizeSensitiveData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    return sanitizeSensitiveString(data) as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeSensitiveData(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const copy: any = {};
    for (const [key, value] of Object.entries(data)) {
      copy[key] = sanitizeSensitiveData(value);
    }
    return copy as T;
  }
  return data;
}
