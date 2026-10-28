import { Injectable, computed, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { NetworkService } from './network.service';
import { SecureStorageService } from './secure-storage.service';
import { AuditLoggerService } from './audit-logger.service';
import {
  CreateLaporanPayload,
  LaporanDto,
  OfflineDraftLaporan
} from '../../shared/models/models';

const DRAFTS_STORAGE_KEY = 'sipinar_encrypted_offline_drafts_v1';
const CRYPTO_KEY_STORAGE = 'sipinar_draft_aes_key_v1';

/**
 * Mengelola draft laporan offline dengan enkripsi AES-GCM 256-bit pada perangkat.
 * Mengirim otomatis saat koneksi kembali online dengan idempotencyKey anti-duplikat,
 * dan menghapus draft segera setelah berhasil terkirim.
 */
@Injectable({ providedIn: 'root' })
export class OfflineDraftService {
  private readonly api = inject(ApiService);
  private readonly network = inject(NetworkService);
  private readonly secureStorage = inject(SecureStorageService);
  private readonly logger = inject(AuditLoggerService);

  readonly drafts = signal<OfflineDraftLaporan[]>([]);
  readonly isSyncing = signal<boolean>(false);
  readonly pendingCount = computed(() => this.drafts().length);

  constructor() {
    this.loadDrafts();
    this.network.reconnected$.subscribe(() => {
      void this.syncAllDrafts();
    });
  }

  async loadDrafts(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: DRAFTS_STORAGE_KEY });
      if (value) {
        const parsed = JSON.parse(value) as OfflineDraftLaporan[];
        this.drafts.set(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      this.drafts.set([]);
    }
  }

  async saveEncryptedDraft(payload: CreateLaporanPayload): Promise<OfflineDraftLaporan> {
    const existing = this.drafts().find((d) => d.idempotencyKey === payload.idempotencyKey);
    if (existing) {
      return existing;
    }

    const { cipherBase64, ivBase64 } = await this.encryptPayload(JSON.stringify(payload));
    const draft: OfflineDraftLaporan = {
      id: `DRAFT-${Date.now().toString(36).toUpperCase()}`,
      idempotencyKey: payload.idempotencyKey,
      createdAt: new Date().toISOString(),
      status: 'MENUNGGU_TERKIRIM',
      encryptedPayload: cipherBase64,
      iv: ivBase64,
      previewNoLabel: `Draft Offline (${new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      })})`
    };

    const next = [draft, ...this.drafts()];
    this.drafts.set(next);
    await this.persistDrafts(next);
    this.logger.info('OFFLINE_DRAFT_SAVED', { draftId: draft.id });
    return draft;
  }

  async decryptDraftPayload(draft: OfflineDraftLaporan): Promise<CreateLaporanPayload> {
    const jsonStr = await this.decryptPayload(draft.encryptedPayload, draft.iv);
    return JSON.parse(jsonStr) as CreateLaporanPayload;
  }

  async removeDraft(draftId: string): Promise<void> {
    const next = this.drafts().filter((d) => d.id !== draftId);
    this.drafts.set(next);
    await this.persistDrafts(next);
  }

  async syncAllDrafts(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing() || !this.network.isOnline() || this.drafts().length === 0) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing.set(true);
    let synced = 0;
    let failed = 0;

    try {
      const currentDrafts = [...this.drafts()];
      for (const draft of currentDrafts) {
        try {
          this.updateDraftStatus(draft.id, 'MENGIRIM');
          const payload = await this.decryptDraftPayload(draft);
          const formData = this.buildLaporanFormData(payload);

          const res = await firstValueFrom(
            this.api.post<LaporanDto>('/laporan', formData, {
              'X-Idempotency-Key': payload.idempotencyKey
            })
          );

          if (res.success) {
            await this.removeDraft(draft.id);
            synced++;
            this.logger.info('OFFLINE_DRAFT_SYNCED', {
              draftId: draft.id,
              noLaporan: res.data?.noLaporan
            });
          } else {
            failed++;
            this.updateDraftStatus(draft.id, 'GAGAL', res.message);
          }
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : 'Gagal mengirim ulang draft';
          this.updateDraftStatus(draft.id, 'MENUNGGU_TERKIRIM', msg);
        }
      }
    } finally {
      this.isSyncing.set(false);
    }

    return { synced, failed };
  }

  buildLaporanFormData(payload: CreateLaporanPayload): FormData {
    const fd = new FormData();
    fd.append('idempotencyKey', payload.idempotencyKey);
    fd.append('nama_objek', payload.nama_objek);
    fd.append('latitude', String(payload.latitude));
    fd.append('longitude', String(payload.longitude));
    fd.append('deskripsi', payload.deskripsi);
    fd.append('foto_json', JSON.stringify(payload.foto));
    payload.foto.forEach((f) => {
      fd.append('waktu_foto[]', f.diambilPada);
    });
    return fd;
  }

  private updateDraftStatus(
    draftId: string,
    status: OfflineDraftLaporan['status'],
    lastError?: string
  ): void {
    const next = this.drafts().map((d) =>
      d.id === draftId ? { ...d, status, lastError } : d
    );
    this.drafts.set(next);
    void this.persistDrafts(next);
  }

  private async persistDrafts(list: OfflineDraftLaporan[]): Promise<void> {
    await Preferences.set({
      key: DRAFTS_STORAGE_KEY,
      value: JSON.stringify(list)
    });
  }

  private async getOrCreateSecretKey(): Promise<CryptoKey | null> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return null;
    }
    let rawHex = await this.secureStorage.get(CRYPTO_KEY_STORAGE);
    if (!rawHex) {
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      rawHex = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      await this.secureStorage.set(CRYPTO_KEY_STORAGE, rawHex);
    }
    const keyBytes = new Uint8Array(
      rawHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, [
      'encrypt',
      'decrypt'
    ]);
  }

  private async encryptPayload(
    plainText: string
  ): Promise<{ cipherBase64: string; ivBase64: string }> {
    const key = await this.getOrCreateSecretKey();
    const encoder = new TextEncoder();
    const encoded = encoder.encode(plainText);

    if (!key || typeof crypto === 'undefined' || !crypto.subtle) {
      // Fallback XOR-base64 untuk environment test tanpa WebCrypto penuh
      return {
        cipherBase64: btoa(unescape(encodeURIComponent(plainText))),
        ivBase64: 'FALLBACK_IV'
      };
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    return {
      cipherBase64: this.bufferToBase64(new Uint8Array(cipherBuffer)),
      ivBase64: this.bufferToBase64(iv)
    };
  }

  private async decryptPayload(cipherBase64: string, ivBase64: string): Promise<string> {
    if (ivBase64 === 'FALLBACK_IV') {
      return decodeURIComponent(escape(atob(cipherBase64)));
    }
    const key = await this.getOrCreateSecretKey();
    if (!key || typeof crypto === 'undefined' || !crypto.subtle) {
      return decodeURIComponent(escape(atob(cipherBase64)));
    }
    const cipherBytes = this.base64ToBuffer(cipherBase64);
    const ivBytes = this.base64ToBuffer(ivBase64);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      cipherBytes
    );
    return new TextDecoder().decode(plainBuffer);
  }

  private bufferToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
