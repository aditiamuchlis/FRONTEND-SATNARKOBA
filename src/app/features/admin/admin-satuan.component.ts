import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { SatuanDto, TipeSatuan } from '../../shared/models/models';

@Component({
  selector: 'app-admin-satuan',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="admin-satuan-page">
      <div class="inst-panel-header">
        <div>
          <h1>Manajemen Satuan Kerja (Polres / Polsek)</h1>
          <div class="text-muted">Hierarki kesatuan dan cakupan wilayah hukum</div>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="onAddSatuan()" novalidate class="inst-card">
        <h2>Tambah Satuan Kerja</h2>
        <div class="satuan-grid">
          <div class="form-field">
            <label for="sKode">Kode Satuan <span class="req">*</span></label>
            <input
              id="sKode"
              type="text"
              class="inst-input mono-code"
              formControlName="kode"
              placeholder="POLSEK-SNN"
            />
          </div>
          <div class="form-field">
            <label for="sNama">Nama Kesatuan <span class="req">*</span></label>
            <input
              id="sNama"
              type="text"
              class="inst-input"
              formControlName="nama"
              placeholder="Polsek Metro Senen"
            />
          </div>
          <div class="form-field">
            <label for="sTipe">Tingkat Kesatuan <span class="req">*</span></label>
            <select id="sTipe" class="inst-select" formControlName="tipe">
              <option [value]="TipeSatuan.POLSEK">POLSEK</option>
              <option [value]="TipeSatuan.POLRES">POLRES</option>
            </select>
          </div>
          <div class="form-field">
            <label for="sWilayah">Wilayah Hukum <span class="req">*</span></label>
            <input
              id="sWilayah"
              type="text"
              class="inst-input"
              formControlName="wilayah"
              placeholder="Kec. Senen, Jakarta Pusat"
            />
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;">
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid">
            Tambah Satuan
          </button>
        </div>
      </form>

      <div class="inst-table-wrap">
        <table class="inst-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Kesatuan</th>
              <th>Tipe</th>
              <th>Wilayah Hukum</th>
            </tr>
          </thead>
          <tbody>
            @for (s of satuanList(); track s.id) {
              <tr>
                <td class="mono-code"><strong>{{ s.kode }}</strong></td>
                <td>{{ s.nama }}</td>
                <td>{{ s.tipe }}</td>
                <td>{{ s.wilayah }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .satuan-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-3);
      }
    `
  ]
})
export class AdminSatuanComponent implements OnInit {
  readonly TipeSatuan = TipeSatuan;
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  readonly satuanList = signal<SatuanDto[]>([]);

  readonly form = this.fb.nonNullable.group({
    kode: ['', [Validators.required]],
    nama: ['', [Validators.required]],
    tipe: [TipeSatuan.POLSEK, [Validators.required]],
    wilayah: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.loadSatuan();
  }

  loadSatuan(): void {
    this.api.get<SatuanDto[]>('/satuan').subscribe({
      next: (res) => this.satuanList.set(res.data ?? [])
    });
  }

  onAddSatuan(): void {
    if (this.form.invalid) return;
    this.api.post<SatuanDto>('/satuan', this.form.getRawValue()).subscribe({
      next: () => {
        this.form.reset({
          kode: '',
          nama: '',
          tipe: TipeSatuan.POLSEK,
          wilayah: ''
        });
        this.loadSatuan();
      }
    });
  }
}
