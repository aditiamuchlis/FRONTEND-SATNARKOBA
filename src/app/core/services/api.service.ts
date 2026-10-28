import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== '') {
          httpParams = httpParams.set(key, String(val));
        }
      }
    }
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${path}`, { params: httpParams });
  }

  post<T>(
    path: string,
    body: unknown,
    headers?: Record<string, string>
  ): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${path}`, body, {
      headers: new HttpHeaders(headers ?? {})
    });
  }

  patch<T>(path: string, body: unknown = {}): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}${path}`, body);
  }

  delete<T>(path: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${path}`);
  }

  uploadWithProgress<T>(
    path: string,
    formData: FormData,
    headers?: Record<string, string>
  ): Observable<HttpEvent<ApiResponse<T>>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${path}`, formData, {
      headers: new HttpHeaders(headers ?? {}),
      reportProgress: true,
      observe: 'events'
    });
  }
}
