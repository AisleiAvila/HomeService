import { Component, ChangeDetectionStrategy, computed, inject, signal, DoCheck } from '@angular/core';

import { GeolocationButtonComponent } from './geolocation-button.component';
import { LeafletMapViewerComponent } from './leaflet-map-viewer.component';
import { GeolocationService } from '../services/geolocation.service';
import { AuthService } from '../services/auth.service';
import { ProfessionalGeolocationService } from '../services/professional-geolocation.service';


@Component({
  selector: 'app-professional-geolocation',
  standalone: true,
  imports: [GeolocationButtonComponent, LeafletMapViewerComponent],
  template: `
    <div class="max-w-xl mx-auto p-4">
      <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
        <i class="fas fa-map-marker-alt"></i>
        Geolocalização do Profissional
      </h3>
      <app-geolocation-button></app-geolocation-button>
      <div class="mt-6">
        @if (error()) {
          <div class="text-red-600 mb-2">{{ error() }}</div>
        }
        @if (isValidCoords) {
          <app-leaflet-map-viewer
            [latitude]="latitude()!"
            [longitude]="longitude()!">
          </app-leaflet-map-viewer>
        }
      </div>
      @if (latitude() && longitude() && user()) {
        <button
          (click)="saveLocation()"
          class="btn btn-success mt-6 w-full flex items-center justify-center gap-2">
          <i class="fas fa-save"></i>
          Salvar localização no perfil
        </button>
      }
      @if (feedback()) {
        <div class="mt-2 text-green-600">{{ feedback() }}</div>
      }
    </div>
    `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class ProfessionalGeolocationComponent implements DoCheck {
  private readonly geolocationService = inject(GeolocationService);
  private readonly authService = inject(AuthService);
  private readonly professionalGeolocationService = inject(ProfessionalGeolocationService);
  latitude = computed(() => this.geolocationService.latitude());
  longitude = computed(() => this.geolocationService.longitude());
  user = computed(() => this.authService.appUser());
  feedback = signal<string|null>(null);
  error = signal<string|null>(null);

  get isValidCoords(): boolean {
    const lat = this.latitude();
    const lng = this.longitude();
    return (
      typeof lat === 'number' && typeof lng === 'number' &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180
    );
  }

  ngDoCheck() {
    if (this.latitude() !== null && this.longitude() !== null && !this.isValidCoords) {
      this.error.set('Latitude ou longitude inválida.');
    } else {
      this.error.set(null);
    }
  }


  async saveLocation() {
    const user = this.user();
    if (!user || !this.isValidCoords) {
      this.feedback.set('Latitude ou longitude inválida.');
      return;
    }
    const ok = await this.professionalGeolocationService.saveProfessionalLocation(user.id, this.latitude(), this.longitude());
    if (ok) {
      this.feedback.set('Localização salva com sucesso!');
    } else {
      this.feedback.set('Falha ao salvar localização.');
    }
  }
}

