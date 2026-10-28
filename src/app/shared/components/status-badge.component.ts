import { Component, Input } from '@angular/core';
import { StatusLaporan } from '../models/models';
import { STATUS_LAPORAN_META } from '../constants/menu.constants';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="status-badge" [class]="meta.cssClass">
      {{ meta.label }}
    </span>
  `,
  styles: [
    `
      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        font-size: 0.75rem;
        font-weight: 700;
        border-radius: var(--radius-sm);
        border: 1px solid transparent;
        white-space: nowrap;
        letter-spacing: 0.01em;
      }
      .badge-baru {
        background-color: var(--status-baru-bg);
        color: var(--status-baru-text);
        border-color: var(--status-baru-border);
      }
      .badge-didisposisi {
        background-color: var(--status-disposisi-bg);
        color: var(--status-disposisi-text);
        border-color: var(--status-disposisi-border);
      }
      .badge-selesai-benar {
        background-color: var(--status-benar-bg);
        color: var(--status-benar-text);
        border-color: var(--status-benar-border);
      }
      .badge-selesai-tidak-benar {
        background-color: var(--status-tidak-benar-bg);
        color: var(--status-tidak-benar-text);
        border-color: var(--status-tidak-benar-border);
      }
    `
  ]
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: StatusLaporan;

  get meta() {
    return (
      STATUS_LAPORAN_META[this.status] ?? {
        label: this.status,
        cssClass: 'badge-didisposisi'
      }
    );
  }
}
