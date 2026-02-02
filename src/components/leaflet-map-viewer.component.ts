
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
  imports: [],
  template: `
    <div class="w-full space-y-3">
      <!-- Botões de Ação -->
      @if (latitude && longitude && currentLocation()) {
        <div class="flex gap-2">
          <button
            (click)="openInGoogleMaps()"
            class="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
            <i class="fab fa-google mr-2"></i>
            Google Maps
          </button>
          <button
            (click)="openInWaze()"
            class="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
            <i class="fas fa-map-marked-alt mr-2"></i>
            Waze
          </button>
        </div>
      }
      
      <!-- Mapa -->
      <div class="w-full h-96 rounded-lg overflow-hidden border border-gray-200">
        @if (latitude && longitude) {
          <div #mapContainer class="w-full h-full"></div>
        } @else {
          <div class="flex items-center justify-center h-full text-gray-500">
            Localização não disponível
          </div>
        }
      </div>
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
  private connectingLine: any = null; // Linha de conexão
  private distanceLabel: any = null; // Label de distância
  private readonly mapInitialized = signal(false);
  readonly currentLocation = signal<{ lat: number; lng: number } | null>(null);

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
    if (this.connectingLine && this.map) {
      this.map.removeLayer(this.connectingLine);
    }
    if (this.distanceLabel && this.map) {
      this.map.removeLayer(this.distanceLabel);
    }
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
              background-color: #dc2626;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              border: 4px solid white;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
            ">
              <i class="fas fa-map-pin" style="color: white; font-size: 18px;"></i>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        }),
      })
        .addTo(this.map)
        .bindPopup('<b style="color: #dc2626; font-size: 14px;">📍 Destino</b><br><span style="font-size: 12px;">Local do serviço</span>');
      
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
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 2px 10px rgba(37, 99, 235, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
          ">
            <i class="fas fa-location-dot" style="color: white; font-size: 18px;"></i>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      }),
    })
      .addTo(this.map)
      .bindPopup('<b style="color: #2563eb; font-size: 14px;">📍 Você está aqui</b><br><span style="font-size: 12px;">Sua posição atual</span>');

    console.log('[Map Viewer] Marcador azul criado com sucesso');

    // Desenhar linha de conexão com distância
    this.drawConnectingLine(lat, lng);

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

  /**
   * Desenha uma linha de conexão entre a posição atual e o destino com distância
   */
  private drawConnectingLine(startLat: number, startLng: number): void {
    const destLat = this.latitude;
    const destLng = this.longitude;
    
    // Limpar linhas anteriores
    if (this.connectingLine && this.map) {
      this.map.removeLayer(this.connectingLine);
      this.connectingLine = null;
    }
    if (this.distanceLabel && this.map) {
      this.map.removeLayer(this.distanceLabel);
      this.distanceLabel = null;
    }
    
    // Calcular distância
    const distance = this.calculateDistance(startLat, startLng, destLat, destLng);
    const distanceDisplay = this.formatDistance(distance);
    
    console.log('[Map Viewer] Desenhando linha de conexão. Distância:', distanceDisplay);
    
    // Criar linha de conexão
    this.connectingLine = L.polyline(
      [[startLat, startLng], [destLat, destLng]],
      {
        color: '#06b6d4',
        weight: 3,
        opacity: 0.6,
        dashArray: '5, 5',
        lineCap: 'round',
        lineJoin: 'round',
      }
    ).addTo(this.map);
    
    console.log('[Map Viewer] Linha de conexão criada');
    
    // Adicionar label de distância no meio da linha
    const midLat = (startLat + destLat) / 2;
    const midLng = (startLng + destLng) / 2;
    
    this.distanceLabel = L.marker([midLat, midLng], {
      icon: L.divIcon({
        className: 'distance-label',
        html: `<div style="background-color: rgba(6, 182, 212, 0.95); color: white; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 13px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;"><i class="fas fa-ruler-horizontal" style="margin-right: 6px;"></i>${distanceDisplay}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, 0],
      }),
    }).addTo(this.map);
    
    console.log('[Map Viewer] Label de distância criado:', distanceDisplay);
  }

  /**
   * Calcula distância em km entre dois pontos (Haversine)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Converte graus para radianos
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Formata distância em metros ou km
   */
  private formatDistance(km: number): string {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  }

  /**
   * Abre o Google Maps com a rota da localização atual para o destino
   */
  openInGoogleMaps(): void {
    const current = this.currentLocation();
    
    if (current && this.latitude && this.longitude) {
      // Abrir com rota da localização atual para o destino
      const url = `https://www.google.com/maps/dir/?api=1&origin=${current.lat},${current.lng}&destination=${this.latitude},${this.longitude}&travelmode=driving`;
      console.log('[Map Viewer] Abrindo Google Maps:', url);
      window.open(url, '_blank');
    } else if (this.latitude && this.longitude) {
      // Abrir apenas o destino se não houver localização atual
      const url = `https://www.google.com/maps/search/?api=1&query=${this.latitude},${this.longitude}`;
      console.log('[Map Viewer] Abrindo Google Maps (destino apenas):', url);
      window.open(url, '_blank');
    }
  }

  /**
   * Abre o Waze com a rota para o destino
   */
  openInWaze(): void {
    if (this.latitude && this.longitude) {
      const url = `https://waze.com/ul?ll=${this.latitude},${this.longitude}&navigate=yes`;
      console.log('[Map Viewer] Abrindo Waze:', url);
      window.open(url, '_blank');
    }
  }
}

