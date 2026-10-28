import { Injectable } from '@angular/core';

const SENSITIVE_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'accessToken',
  'refreshToken',
  'token',
  'authorization',
  'deskripsi',
  'namaObjek',
  'nama_objek',
  'latitude',
  'longitude',
  'foto',
  'dataUrl',
  'encryptedPayload'
]);

@Injectable({ providedIn: 'root' })
export class AuditLoggerService {
  sanitize(payload: unknown): unknown {
    if (payload === null || payload === undefined) {
      return payload;
    }
    if (typeof payload !== 'object') {
      return payload;
    }
    if (Array.isArray(payload)) {
      return `[Array(${payload.length})]`;
    }
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(payload as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) {
        result[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null) {
        result[key] = this.sanitize(val);
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  info(event: string, meta?: Record<string, unknown>): void {
    const safeMeta = meta ? this.sanitize(meta) : undefined;
    console.info(`[SIPINAR] ${event}`, safeMeta ?? '');
  }

  warn(event: string, meta?: Record<string, unknown>): void {
    const safeMeta = meta ? this.sanitize(meta) : undefined;
    console.warn(`[SIPINAR:WARN] ${event}`, safeMeta ?? '');
  }

  error(event: string, err?: unknown): void {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[SIPINAR:ERROR] ${event}: ${message}`);
  }
}
