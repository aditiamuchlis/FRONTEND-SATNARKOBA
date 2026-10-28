import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty-box">
      <div class="empty-title">{{ title }}</div>
      <p class="empty-desc">{{ description }}</p>
      @if (actionLabel) {
        <button type="button" class="btn btn-primary btn-sm" (click)="actionClick.emit()">
          {{ actionLabel }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .empty-box {
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--space-6) var(--space-4);
        text-align: center;
      }
      .empty-title {
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--color-text-primary);
        margin-bottom: var(--space-1);
      }
      .empty-desc {
        margin: 0 0 var(--space-3) 0;
        color: var(--color-text-secondary);
        font-size: 0.85rem;
      }
    `
  ]
})
export class EmptyStateComponent {
  @Input({ required: true }) title!: string;
  @Input() description = 'Belum ada data yang tercatat pada kategori ini.';
  @Input() actionLabel?: string;
  @Output() actionClick = new EventEmitter<void>();
}
