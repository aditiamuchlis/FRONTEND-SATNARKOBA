import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import * as L from 'leaflet';

/**
 * Abstraksi peta Leaflet + OpenStreetMap tanpa API key.
 * Mendukung mode koreksi titik koordinat (editable = true) dan mode baca (editable = false).
 */
@Component({
  selector: 'app-leaflet-map',
  standalone: true,
  template: `
    <div class="map-wrapper">
      <div #mapContainer class="leaflet-box" [style.height.px]="height"></div>
      <div class="coord-footer tabular-nums">
        <span>Koordinat: {{ latitude.toFixed(6) }}, {{ longitude.toFixed(6) }}</span>
        @if (editable) {
          <span class="hint-text">Geser pin atau ketuk peta untuk koreksi titik</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .map-wrapper {
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        overflow: hidden;
        background: var(--color-navy-50);
      }
      .leaflet-box {
        width: 100%;
        z-index: 1;
      }
      .coord-footer {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        background: var(--color-bg-surface);
        border-top: 1px solid var(--color-border);
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--color-text-primary);
      }
      .hint-text {
        color: var(--color-text-secondary);
        font-weight: 400;
      }
    `
  ]
})
export class LeafletMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() latitude = -6.17539;
  @Input() longitude = 106.82715;
  @Input() editable = false;
  @Input() height = 220;

  @Output() coordinatesChange = new EventEmitter<{ latitude: number; longitude: number }>();

  private map: L.Map | null = null;
  private marker: L.CircleMarker | L.Marker | null = null;

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map && (changes['latitude'] || changes['longitude'])) {
      const latlng = L.latLng(this.latitude, this.longitude);
      this.marker?.setLatLng(latlng);
      this.map.panTo(latlng);
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap(): void {
    if (typeof window === 'undefined' || !this.mapContainer?.nativeElement) {
      return;
    }

    try {
      const center = L.latLng(this.latitude, this.longitude);
      this.map = L.map(this.mapContainer.nativeElement, {
        center,
        zoom: 16,
        attributionControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(this.map);

      const customIcon = L.divIcon({
        className: 'sipinar-map-pin',
        html: `<div style="width:20px;height:20px;background:#102a43;border:3px solid #b78a28;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const m = L.marker(center, {
        draggable: this.editable,
        icon: customIcon
      }).addTo(this.map);

      if (this.editable) {
        m.on('dragend', () => {
          const pos = m.getLatLng();
          this.latitude = Number(pos.lat.toFixed(6));
          this.longitude = Number(pos.lng.toFixed(6));
          this.coordinatesChange.emit({
            latitude: this.latitude,
            longitude: this.longitude
          });
        });

        this.map.on('click', (e: L.LeafletMouseEvent) => {
          m.setLatLng(e.latlng);
          this.latitude = Number(e.latlng.lat.toFixed(6));
          this.longitude = Number(e.latlng.lng.toFixed(6));
          this.coordinatesChange.emit({
            latitude: this.latitude,
            longitude: this.longitude
          });
        });
      }

      this.marker = m;
      setTimeout(() => this.map?.invalidateSize(), 150);
    } catch {
      // Safe fallback in headless test environments
    }
  }
}
