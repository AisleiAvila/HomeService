import { Component, ChangeDetectionStrategy, signal, Output, EventEmitter, inject } from '@angular/core';
import { GeolocationService } from '../services/geolocation.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-geolocation-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button (click)="getLocation()" class="btn btn-primary w-full flex items-center justify-center gap-2">
      <i class="fas fa-location-arrow"></i>
      Obter minha localização
    </button>
    <div *ngIf="error()" class="text-red-500 mt-2">{{ error() }}</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeolocationButtonComponent {
  @Output() coordinates = new EventEmitter<{ latitude: number; longitude: number }>();
  error = signal<string|null>(null);

  private readonly geolocationService = inject(GeolocationService);

  getLocation() {
    if (!navigator.geolocation) {
      this.error.set('Geolocalização não suportada pelo navegador.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.coordinates.emit({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        this.error.set(null);
        this.geolocationService.setCoordinates(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        let errorMessage = 'Não foi possível obter a localização.';
        if (err.code === err.TIMEOUT) {
          errorMessage = 'Tempo esgotado. Tente novamente.';
        } else if (err.code === err.PERMISSION_DENIED) {
          errorMessage = 'Permissão negada. Ative a localização.';
        }
        this.error.set(errorMessage);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  }
}
