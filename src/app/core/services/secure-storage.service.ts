import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

/**
 * Menyimpan kredensial/token pada Secure Storage di Android (Keystore-backed)
 * dan di memori pada Web (tidak pernah menaruh token mentah di localStorage).
 */
@Injectable({ providedIn: 'root' })
export class SecureStorageService {
  private readonly memoryStore = new Map<string, string>();
  private readonly photoBlobUrls = new Set<string>();

  async set(key: string, value: string): Promise<void> {
    this.memoryStore.set(key, value);
    if (Capacitor.isNativePlatform()) {
      try {
        await SecureStoragePlugin.set({ key, value });
      } catch {
        // Fallback ke memoryStore jika plugin native belum siap di emulator
      }
    } else {
      try {
        // Di web simpan obfuscated di sessionStorage agar tahan reload tab tunggal, bukan localStorage
        sessionStorage.setItem(`sipinar_sec_${key}`, btoa(encodeURIComponent(value)));
      } catch {
        // Ignore storage quota errors
      }
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.memoryStore.has(key)) {
      return this.memoryStore.get(key) ?? null;
    }
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await SecureStoragePlugin.get({ key });
        if (res?.value) {
          this.memoryStore.set(key, res.value);
          return res.value;
        }
      } catch {
        return null;
      }
    } else {
      try {
        const encoded = sessionStorage.getItem(`sipinar_sec_${key}`);
        if (encoded) {
          const decoded = decodeURIComponent(atob(encoded));
          this.memoryStore.set(key, decoded);
          return decoded;
        }
      } catch {
        return null;
      }
    }
    return null;
  }

  async remove(key: string): Promise<void> {
    this.memoryStore.delete(key);
    if (Capacitor.isNativePlatform()) {
      try {
        await SecureStoragePlugin.remove({ key });
      } catch {
        // Ignore if key does not exist
      }
    } else {
      try {
        sessionStorage.removeItem(`sipinar_sec_${key}`);
      } catch {
        // Ignore
      }
    }
  }

  async clearAll(): Promise<void> {
    this.memoryStore.clear();
    this.clearPhotoCache();
    if (Capacitor.isNativePlatform()) {
      try {
        await SecureStoragePlugin.clear();
      } catch {
        // Ignore
      }
    } else {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith('sipinar_sec_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch {
        // Ignore
      }
    }
  }

  registerTransientPhotoUrl(url: string): void {
    if (url.startsWith('blob:')) {
      this.photoBlobUrls.add(url);
    }
  }

  clearPhotoCache(): void {
    for (const blobUrl of this.photoBlobUrls) {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Ignore
      }
    }
    this.photoBlobUrls.clear();
  }
}
