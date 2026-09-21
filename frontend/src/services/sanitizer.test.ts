import { describe, it, expect } from 'vitest';
import { sanitizeSensitiveString, sanitizeSensitiveData } from './sanitizer.js';

describe('Sanitizer: Sensitive Credential Masking', () => {
  it('masks Elasticsearch API key id in security_exception error messages', () => {
    const rawError = 'security_exception\\n\\tRoot causes:\\n\\t\\tsecurity_exception: action [indices:data/read/search] is unauthorized for API key id [GuIBxaAB4CdYMyLHBi2e] of user [elastic], this action is granted by the index privileges [read,all]';
    
    const sanitized = sanitizeSensitiveString(rawError);
    
    expect(sanitized).not.toContain('GuIBxaAB4CdYMyLHBi2e');
    expect(sanitized).toContain('API key id [GuIB••••Bi2e]');
    expect(sanitized).toContain('action [indices:data/read/search]');
    expect(sanitized).toContain('user [elastic]');
  });

  it('masks API key in square brackets without "id"', () => {
    const text = 'Authorization failed for API key [abcdef123456789]';
    const sanitized = sanitizeSensitiveString(text);
    expect(sanitized).not.toContain('abcdef123456789');
    expect(sanitized).toContain('API key [abcd••••6789]');
  });

  it('masks Bearer and ApiKey header values', () => {
    const header1 = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const header2 = 'ApiKey VGVCN3RxQUI0Q2RZTXlMSFByUTc6SDBMSENpN1dUeU9WdGRaRVZhQzNkZw==';
    
    expect(sanitizeSensitiveString(header1)).toBe('Bearer eyJh••••VCJ9');
    expect(sanitizeSensitiveString(header2)).toBe('ApiKey VGVC••••Zw==');
  });

  it('masks password and secret fields in JSON', () => {
    const jsonStr = '{"username": "admin", "password": "supersecretpassword123", "secret": "topsecret"}';
    const sanitized = sanitizeSensitiveString(jsonStr);
    expect(sanitized).not.toContain('supersecretpassword123');
    expect(sanitized).not.toContain('topsecret');
    expect(sanitized).toContain('"password": "••••••••"');
    expect(sanitized).toContain('"secret": "••••••••"');
  });

  it('recursively sanitizes nested objects and arrays', () => {
    const errorObj = {
      type: 'ResponseError',
      status: 403,
      message: 'security_exception: action [search] is unauthorized for API key id [GuIBxaAB4CdYMyLHBi2e]',
      details: {
        root_causes: [
          {
            reason: 'unauthorized for API key id [GuIBxaAB4CdYMyLHBi2e]'
          }
        ]
      }
    };

    const sanitized = sanitizeSensitiveData(errorObj);
    expect(sanitized.message).toContain('API key id [GuIB••••Bi2e]');
    expect(sanitized.details.root_causes[0].reason).toContain('API key id [GuIB••••Bi2e]');
    expect(JSON.stringify(sanitized)).not.toContain('GuIBxaAB4CdYMyLHBi2e');
  });
});
