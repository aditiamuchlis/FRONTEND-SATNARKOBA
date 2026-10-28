import { Injectable, signal } from '@angular/core';
import { Network } from '@capacitor/network';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NetworkService {
  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  private readonly reconnectedSubject = new Subject<void>();
  readonly reconnected$ = this.reconnectedSubject.asObservable();

  constructor() {
    this.initNetworkListeners();
  }

  private async initNetworkListeners(): Promise<void> {
    try {
      const status = await Network.getStatus();
      this.isOnline.set(status.connected);

      await Network.addListener('networkStatusChange', (newStatus) => {
        const wasOffline = !this.isOnline();
        this.isOnline.set(newStatus.connected);
        if (wasOffline && newStatus.connected) {
          this.reconnectedSubject.next();
        }
      });
    } catch {
      // Fallback ke browser window events
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          const wasOffline = !this.isOnline();
          this.isOnline.set(true);
          if (wasOffline) {
            this.reconnectedSubject.next();
          }
        });
        window.addEventListener('offline', () => {
          this.isOnline.set(false);
        });
      }
    }
  }

  /**
   * Memudahkan simulasi mode offline/online saat pengujian di lapangan atau demo
   */
  setSimulatedOnlineState(online: boolean): void {
    const wasOffline = !this.isOnline();
    this.isOnline.set(online);
    if (wasOffline && online) {
      this.reconnectedSubject.next();
    }
  }
}
