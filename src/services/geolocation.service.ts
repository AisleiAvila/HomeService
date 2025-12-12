import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private readonly _latitude = signal<number|null>(null);
  private readonly _longitude = signal<number|null>(null);

  latitude = this._latitude.asReadonly();
  longitude = this._longitude.asReadonly();

  setCoordinates(lat: number, lng: number) {
    this._latitude.set(lat);
    this._longitude.set(lng);
  }

  clear() {
    this._latitude.set(null);
    this._longitude.set(null);
  }
}
