import { CommonModule } from '@angular/common';
import { 
  ChangeDetectionStrategy, 
  Component, 
  Input, 
  AfterViewInit, 
  OnDestroy, 
  ViewChild, 
  ElementRef,
  signal,
  effect
} from '@angular/core';

declare const L: any;

@Component({
  selector: 'app-leaflet-map-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-96 rounded-lg overflow-hidden border border-gray-200">
      @if (latitude && longitude) {
        <div #mapContainer class="w-full h-full"></div>
      } @else {
        <div class="flex items-center justify-center h-full text-gray-500">
          Localização não disponível
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeafletMapViewerComponent implements AfterViewInit, OnDestroy {
  @Input() latitude!: number;
  @Input() longitude!: number;
  @Input() showCurrentLocation = true; // Mostrar localização atual do usuário
  @ViewChild('mapContainer', { static: false }) mapContainer?: ElementRef;

  private map: any = null;
  private marker: any = null;
  private currentLocationMarker: any = null;
  private readonly mapInitialized = signal(false);
  private readonly currentLocation = signal<{ lat: number; lng: number } | null>(null);

  constructor() {
    // Effect para atualizar o mapa quando as coordenadas mudarem
    effect(() => {
      if (this.mapInitialized() && this.latitude && this.longitude) {
        this.updateMap();
      }
    });

    // Effect para atualizar localização atual
    effect(() => {
      const current = this.currentLocation();
      if (this.mapInitialized() && current) {
        this.updateCurrentLocationMarker(current.lat, current.lng);
      }
    });
  }

  ngAfterViewInit(): void {
    // Aguardar um pouco para garantir que o Leaflet foi carregado
    setTimeout(() => {
      this.initMap();
      if (this.showCurrentLocation) {
        this.getCurrentLocation();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private getCurrentLocation(): void {
    console.log('[Map Viewer] Solicitando localização atual...');
    
    if (!navigator.geolocation) {
      console.warn('[Map Viewer] Geolocalização não suportada pelo navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[Map Viewer] Localização obtida:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        this.currentLocation.set({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('[Map Viewer] Erro ao obter localização:', error.message);
      },
      {
        enableHighAccuracy: false, // Reduzir precisão para melhorar velocidade
        timeout: 15000, // Timeout maior para ambientes serverless
        maximumAge: 30000, // Permitir cache de 30 segundos
      }
    );
  }

  private initMap(): void {
    if (!this.mapContainer || !this.latitude || !this.longitude) {
      return;
    }

    // Verificar se Leaflet está disponível
    if (L === undefined) {
      console.error('Leaflet não está carregado. Verifique se o script foi incluído no index.html');
      return;
    }

    try {
      // Criar o mapa
      this.map = L.map(this.mapContainer.nativeElement, {
        center: [this.latitude, this.longitude],
        zoom: 16,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Adicionar camada de tiles do OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(this.map);

      // Adicionar marcador vermelho para o destino
      console.log('[Map Viewer] Criando marcador de destino em:', this.latitude, this.longitude);
      this.marker = L.marker([this.latitude, this.longitude], {
        icon: L.divIcon({
          className: 'custom-destination-marker',
          html: `
            <div style="
              background-color: #ef4444;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: 4px solid white;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <i class="fas fa-location-dot" style="color: white; font-size: 16px;"></i>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        }),
      })
        .addTo(this.map)
        .bindPopup('<b>Local do Serviço</b>');
      
      this.mapInitialized.set(true);
      console.log('[Map Viewer] Mapa inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar o mapa:', error);
    }
  }

  private updateMap(): void {
    if (!this.map || !this.marker) {
      return;
    }

    const newLatLng = L.latLng(this.latitude, this.longitude);
    
    // Atualizar posição do marcador
    this.marker.setLatLng(newLatLng);
    
    // Centralizar mapa na nova posição
    this.map.setView(newLatLng, this.map.getZoom());
  }

  private updateCurrentLocationMarker(lat: number, lng: number): void {
    console.log('[Map Viewer] Atualizando marcador de localização atual:', lat, lng);
    
    if (!this.map) {
      console.warn('[Map Viewer] Mapa não inicializado');
      return;
    }

    // Remover marcador anterior se existir
    if (this.currentLocationMarker) {
      this.map.removeLayer(this.currentLocationMarker);
    }

    // Criar marcador da localização atual com ícone azul
    this.currentLocationMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'custom-current-location-marker',
        html: `
          <div style="
            background-color: #2563eb;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 2px 10px rgba(37, 99, 235, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              background-color: white;
              width: 10px;
              height: 10px;
              border-radius: 50%;
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    })
      .addTo(this.map)
      .bindPopup('<b>Sua localização atual</b>');

    console.log('[Map Viewer] Marcador azul criado com sucesso');

    // Ajustar zoom para mostrar ambos os marcadores
    if (this.marker) {
      const bounds = L.latLngBounds([
        [lat, lng],
        [this.latitude, this.longitude],
      ]);
      this.map.fitBounds(bounds, { padding: [50, 50] });
      console.log('[Map Viewer] Zoom ajustado para mostrar ambos os marcadores');
    }
  }
}
