import { Injectable, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { NotifikasiDto } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class NotifikasiStateService {
  private readonly api = inject(ApiService);

  readonly items = signal<NotifikasiDto[]>([]);
  readonly unreadCount = signal<number>(0);
  readonly loading = signal<boolean>(false);

  refreshUnreadCount(): void {
    this.api.get<{ count: number }>('/notifikasi/unread-count').subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.unreadCount.set(res.data.count);
        }
      },
      error: () => {}
    });
  }

  loadNotifikasi(): void {
    this.loading.set(true);
    this.api.get<NotifikasiDto[]>('/notifikasi').subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.items.set(res.data);
          this.unreadCount.set(res.data.filter((n) => !n.dibacaAt).length);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  markAsRead(id: string) {
    return this.api.patch<NotifikasiDto>(`/notifikasi/${id}/baca`, {}).pipe(
      tap((res) => {
        if (res.success) {
          const now = new Date().toISOString();
          const updated = this.items().map((n) =>
            n.id === id ? { ...n, dibacaAt: n.dibacaAt ?? now } : n
          );
          this.items.set(updated);
          this.unreadCount.set(updated.filter((n) => !n.dibacaAt).length);
        }
      })
    );
  }

  markAllAsRead() {
    return this.api.patch<{ updated: number }>('/notifikasi/baca-semua', {}).pipe(
      tap((res) => {
        if (res.success) {
          const now = new Date().toISOString();
          const updated = this.items().map((n) => ({ ...n, dibacaAt: n.dibacaAt ?? now }));
          this.items.set(updated);
          this.unreadCount.set(0);
        }
      })
    );
  }
}
