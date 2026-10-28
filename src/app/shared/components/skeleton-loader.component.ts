import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  template: `
    <div class="skeleton-wrap" role="status" aria-label="Memuat data">
      @for (row of rowsArray; track row) {
        <div class="skeleton-row">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line subtitle"></div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .skeleton-wrap {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .skeleton-row {
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: var(--space-3) var(--space-4);
      }
      .skeleton-line {
        height: 12px;
        background: #e2e8f0;
        border-radius: 3px;
        animation: pulse-opacity 1.4s infinite ease-in-out;
      }
      .skeleton-line.title {
        width: 45%;
        margin-bottom: var(--space-2);
      }
      .skeleton-line.subtitle {
        width: 75%;
      }
      @keyframes pulse-opacity {
        0%,
        100% {
          opacity: 0.55;
        }
        50% {
          opacity: 1;
        }
      }
    `
  ]
})
export class SkeletonLoaderComponent {
  @Input() rows = 3;

  get rowsArray(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }
}
