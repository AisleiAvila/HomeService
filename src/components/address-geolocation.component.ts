import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { PortugalAddressDatabaseService } from '../services/portugal-address-database.service';
import { EnderecoCompleto } from '../models/maintenance.models';

@Component({
  selector: 'app-address-geolocation',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="max-w-xl mx-auto p-4">
      <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
        <i class="fas fa-search-location"></i>
        Buscar geolocalização por endereço
      </h3>
      <input type="text" [(ngModel)]="postalCode" placeholder="Código Postal (ex: 1000-001)" class="input input-bordered w-full mb-2" />
      <button (click)="buscarEndereco()" class="btn btn-primary w-full mb-4">Buscar</button>
      @if (error()) {
        <div class="text-red-600 mb-2">{{ error() }}</div>
      }
      @if (endereco()) {
        <div>
          <div class="mb-2">Endereço: {{ endereco().designacao_postal }}, {{ endereco().localidade }}, {{ endereco().concelho }}, {{ endereco().distrito }}</div>
          @if (endereco().latitude && endereco().longitude) {
            <div>
              <div>Latitude: {{ endereco().latitude }}</div>
              <div>Longitude: {{ endereco().longitude }}</div>
            </div>
          }
          @if (!endereco().latitude || !endereco().longitude) {
            <div class="text-yellow-600">Este código postal não possui coordenadas cadastradas.</div>
          }
        </div>
      }
    </div>
    `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressGeolocationComponent {
  private readonly addressService = inject(PortugalAddressDatabaseService);
  postalCode = '';
  endereco = signal<EnderecoCompleto|null>(null);
  error = signal<string|null>(null);

  async buscarEndereco() {
    this.error.set(null);
    this.endereco.set(null);
    if (!this.postalCode || this.postalCode.length < 8) {
      this.error.set('Informe um código postal válido.');
      return;
    }
    try {
      const result = await this.addressService.getEnderecoByCodigoPostal(this.postalCode);
      if (result) {
        this.endereco.set(result);
      } else {
        this.error.set('Endereço não encontrado para o código postal informado.');
      }
    } catch (e) {
      console.error('Erro ao buscar endereço:', e);
      this.error.set('Erro ao buscar endereço.');
    }
  }
}

