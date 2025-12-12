import {
  Component,
  input,
  AfterViewInit,
  OnDestroy,
  signal,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nPipe } from '../pipes/i18n.pipe';

declare const L: any;

interface RouteInfo {
  distance: string;
  duration: string;
  remainingDistance?: string;
  remainingTime?: string;
  instructions: Array<{
    text: string;
    distance: string;
  }>;
}

@Component({
  selector: 'app-leaflet-route-map',
  standalone: true,
  imports: [CommonModule, I18nPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <!-- Loading State -->
      @if (loading()) {
        <div class="flex items-center justify-center p-8 bg-blue-50 rounded-lg">
          <div class="text-center">
            <i class="fas fa-spinner fa-spin text-3xl text-blue-600 mb-2"></i>
            <p class="text-sm text-gray-600">{{ 'obtainingLocation' | i18n }}</p>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <i class="fas fa-exclamation-triangle text-red-600 mt-1"></i>
            <div class="flex-1">
              <h4 class="font-semibold text-red-900 mb-1">{{ 'error' | i18n }}</h4>
              <p class="text-sm text-red-700">{{ error() }}</p>
              <button
                (click)="retryRoute()"
                class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                <i class="fas fa-redo mr-2"></i>
                {{ 'retry' | i18n }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Route Info -->
      @if (routeInfo() && !loading()) {
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <!-- Real-time Tracking Toggle -->
          <div class="mb-4">
            <button
              (click)="toggleTracking()"
              [class]="isTracking() ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'"
              class="w-full px-4 py-3 text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-2">
              <i class="fas fa-{{isTracking() ? 'stop' : 'play'}}"></i>
              {{ isTracking() ? 'Parar Rastreamento' : 'Iniciar Navegação em Tempo Real' }}
            </button>
          </div>

          <!-- Current Speed (when tracking) -->
          @if (isTracking() && currentSpeed()) {
            <div class="bg-white rounded-lg p-3 shadow-sm mb-4 border-2 border-green-500">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <i class="fas fa-tachometer-alt text-green-600 text-xl"></i>
                  <span class="text-sm font-medium text-gray-600">Velocidade Atual</span>
                </div>
                <p class="text-2xl font-bold text-green-600">{{ currentSpeed() }} km/h</p>
              </div>
            </div>
          }

          <!-- Distance/Time Grid -->
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="bg-white rounded-lg p-3 shadow-sm">
              <div class="flex items-center gap-2 mb-1">
                <i class="fas fa-road text-blue-600"></i>
                <span class="text-xs font-medium text-gray-500">
                  {{ isTracking() && routeInfo()!.remainingDistance ? 'Restante' : 'Distância' }}
                </span>
              </div>
              <p class="text-lg font-bold text-gray-900">
                {{ isTracking() && routeInfo()!.remainingDistance ? routeInfo()!.remainingDistance : routeInfo()!.distance }}
              </p>
            </div>
            <div class="bg-white rounded-lg p-3 shadow-sm">
              <div class="flex items-center gap-2 mb-1">
                <i class="fas fa-clock text-blue-600"></i>
                <span class="text-xs font-medium text-gray-500">
                  {{ isTracking() && routeInfo()!.remainingTime ? 'Tempo Restante' : 'Tempo Estimado' }}
                </span>
              </div>
              <p class="text-lg font-bold text-gray-900">
                {{ isTracking() && routeInfo()!.remainingTime ? routeInfo()!.remainingTime : routeInfo()!.duration }}
              </p>
            </div>
          </div>

          @if (!isTracking()) {
            <!-- Quick Actions (only when not tracking) -->
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
        </div>
      }

      <!-- Map Container -->
      <div
        id="route-map-{{mapId()}}"
        class="rounded-lg shadow-lg border border-gray-200 overflow-hidden"
        [style.height]="mapHeight()"
        [class.opacity-50]="loading()">
      </div>

      <!-- Turn-by-Turn Instructions -->
      @if (routeInfo() && !loading() && showInstructions()) {
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <button
            (click)="toggleInstructions()"
            class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div class="flex items-center gap-2">
              <i class="fas fa-list-ol text-blue-600"></i>
              <span class="font-semibold text-gray-900">{{ 'routeInstructions' | i18n }}</span>
              <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {{ routeInfo()!.instructions.length }} {{ 'steps' | i18n }}
              </span>
            </div>
            <i class="fas fa-chevron-{{instructionsExpanded() ? 'up' : 'down'}} text-gray-400"></i>
          </button>
          
          @if (instructionsExpanded()) {
            <div class="border-t border-gray-200">
              <div class="max-h-96 overflow-y-auto">
                @for (instruction of routeInfo()!.instructions; track $index) {
                  <div class="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <div class="flex items-start gap-3">
                      <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                        {{ $index + 1 }}
                      </div>
                      <div class="flex-1">
                        <p class="text-sm text-gray-900">{{ instruction.text }}</p>
                        @if (instruction.distance) {
                          <p class="text-xs text-gray-500 mt-1">
                            <i class="fas fa-arrow-right mr-1"></i>
                            {{ instruction.distance }}
                          </p>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class LeafletRouteMapComponent implements AfterViewInit, OnDestroy {
  // Inputs
  destinationLatitude = input.required<number>();
  destinationLongitude = input.required<number>();
  mapHeight = input<string>('400px');
  showInstructions = input<boolean>(true);

  // State signals
  loading = signal(false);
  error = signal<string | null>(null);
  routeInfo = signal<RouteInfo | null>(null);
  instructionsExpanded = signal(false);
  mapId = signal(Math.random().toString(36).substring(2, 11));
  isTracking = signal(false);
  currentSpeed = signal<number | null>(null); // km/h

  private map: any;
  private routingControl: any;
  private routePolyline: any = null; // Store route polyline for cleanup
  private startMarker: any = null; // Store start marker for cleanup
  private readonly currentLocation = signal<{ lat: number; lng: number } | null>(null);
  private currentPositionMarker: any = null;
  private watchId: number | null = null;

  constructor() {
    // Effect to initialize route when component is ready
    effect(() => {
      const lat = this.destinationLatitude();
      const lng = this.destinationLongitude();
      if (this.map && lat && lng) {
        this.initializeRoute();
      }
    });
  }

  ngAfterViewInit(): void {
    // Wait for libraries to load
    this.waitForLibraries().then(() => {
      this.initializeMap();
    }).catch((error) => {
      console.error('[Route] Error loading libraries:', error);
      this.error.set('Erro ao carregar bibliotecas de mapa. Recarregue a página.');
      this.loading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.stopTracking();
    
    // Cleanup map layers
    if (this.routePolyline && this.map) {
      this.map.removeLayer(this.routePolyline);
    }
    if (this.startMarker && this.map) {
      this.map.removeLayer(this.startMarker);
    }
    if (this.routingControl && this.map) {
      this.map.removeControl(this.routingControl);
    }
    
    if (this.map) {
      this.map.remove();
    }
  }

  private async waitForLibraries(): Promise<void> {
    // Wait for Leaflet to be available
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max

    while (attempts < maxAttempts) {
      const leaflet = (globalThis as any).L;
      if (leaflet?.Routing) {
        console.log('[Route] Libraries loaded successfully');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    throw new Error('Leaflet Routing Machine não carregou');
  }

  private initializeMap(): void {
    const destLat = this.destinationLatitude();
    const destLng = this.destinationLongitude();

    // Initialize map centered on destination
    this.map = L.map(`route-map-${this.mapId()}`, {
      zoomControl: true,
      attributionControl: true,
    }).setView([destLat, destLng], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    // Add destination marker
    L.marker([destLat, destLng], {
      icon: L.divIcon({
        className: 'custom-destination-marker',
        html: '<div style="background-color: #dc2626; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><i class="fas fa-flag-checkered" style="color: white; font-size: 12px;"></i></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    })
      .addTo(this.map)
      .bindPopup('<b>Destino</b><br>Local do serviço');

    // Start getting route
    this.initializeRoute();
  }

  private async initializeRoute(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Get current location
      const position = await this.getCurrentPosition();
      this.currentLocation.set({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      // Calculate straight-line distance as fallback
      const distance = this.calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        this.destinationLatitude(),
        this.destinationLongitude()
      );

      // Set basic route info with straight-line distance
      this.routeInfo.set({
        distance: this.formatDistance(distance * 1000),
        duration: this.formatDuration((distance / 50) * 3600), // Estimate: 50 km/h average
        instructions: [{
          text: 'Distância em linha reta. Use Google Maps ou Waze para navegação detalhada.',
          distance: '',
        }],
      });

      this.loading.set(false);

      // Try to create detailed route (may fail with public servers)
      this.createRoute(
        position.coords.latitude,
        position.coords.longitude,
        this.destinationLatitude(),
        this.destinationLongitude()
      );
    } catch (err: any) {
      console.error('Route error:', err);
      this.error.set(
        err.message || 'Não foi possível obter sua localização. Verifique as permissões do navegador.'
      );
      this.loading.set(false);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula for great-circle distance
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private createCustomRouter(): any {
    // List of routing servers to try (in order)
    const servers = [
      'https://routing.openstreetmap.de/routed-car/route/v1',
      'https://router.project-osrm.org/route/v1',
    ];

    let currentServerIndex = 0;

    return {
      route: (waypoints: any[], callback: any, context: any, options: any) => {
        const tryNextServer = (serverIndex: number) => {
          if (serverIndex >= servers.length) {
            console.error('[Route] Todos os servidores falharam');
            callback.call(context, {
              status: -1,
              message: 'Todos os servidores de roteamento estão indisponíveis'
            });
            return;
          }

          const serviceUrl = servers[serverIndex];
          console.log(`[Route] Tentando servidor ${serverIndex + 1}/${servers.length}: ${serviceUrl}`);

          const router = L.Routing.osrmv1({
            serviceUrl: serviceUrl,
            timeout: 10000,
          });

          router.route(waypoints, (err: any, routes: any) => {
            if (err || !routes || routes.length === 0) {
              console.warn(`[Route] Servidor ${serverIndex + 1} falhou:`, err);
              // Try next server
              tryNextServer(serverIndex + 1);
            } else {
              console.log(`[Route] Rota calculada com sucesso usando servidor ${serverIndex + 1}`);
              callback.call(context, null, routes);
            }
          }, context, options);
        };

        tryNextServer(currentServerIndex);
      }
    };
  }

  private getCurrentPosition(retryCount = 0): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não é suportada pelo seu navegador'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: retryCount === 0, // Primeira tentativa: alta precisão
        timeout: retryCount === 0 ? 15000 : 20000, // Timeouts mais longos para ambientes serverless
        maximumAge: retryCount > 0 ? 30000 : 5000, // Permitir cache em retentativas
      };

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        async (error) => {
          let message = 'Erro ao obter localização';
          
          // Se timeout e ainda temos tentativas, retry com configurações mais permissivas
          if (error.code === error.TIMEOUT && retryCount < 2) {
            console.warn(`[Geolocation] Timeout na tentativa ${retryCount + 1}, tentando novamente...`);
            try {
              const position = await this.getCurrentPosition(retryCount + 1);
              resolve(position);
              return;
            } catch (retryError) {
              // Se retry falhar, loga o erro e continua com o erro original
              console.warn(`[Geolocation] Retry ${retryCount + 1} falhou:`, retryError);
            }
          }
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Permissão de localização negada. Ative nas configurações do navegador.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Localização indisponível no momento. Tente novamente.';
              break;
            case error.TIMEOUT:
              message = 'Tempo esgotado ao obter localização. Tente novamente em alguns segundos.';
              break;
          }
          reject(new Error(message));
        },
        options
      );
    });
  }

  private async createRoute(startLat: number, startLng: number, endLat: number, endLng: number): Promise<void> {
    console.log('[Route] Creating route from:', startLat, startLng, 'to:', endLat, endLng);
    
    try {
      // Usar API serverless da Vercel para evitar problemas CORS
      const apiUrl = `/api/route?startLat=${startLat}&startLng=${startLng}&endLat=${endLat}&endLng=${endLng}`;
      console.log('[Route] Chamando API serverless:', apiUrl);
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.warn('[Route] API falhou, usando distância em linha reta');
        return;
      }
      
      console.log('[Route] Rota recebida da API:', data);
      
      // Limpar rotas anteriores
      if (this.routePolyline) {
        this.map.removeLayer(this.routePolyline);
      }
      if (this.startMarker) {
        this.map.removeLayer(this.startMarker);
      }
      
      // Adicionar linha da rota ao mapa
      if (data.coordinates && data.coordinates.length > 0) {
        this.routePolyline = L.polyline(data.coordinates, {
          color: '#2563eb',
          weight: 6,
          opacity: 0.8,
        }).addTo(this.map);
        
        // Ajustar zoom para mostrar toda a rota
        this.map.fitBounds(this.routePolyline.getBounds(), { padding: [50, 50] });
        
        // Adicionar marcador de início
        this.startMarker = L.marker([startLat, startLng], {
          icon: L.divIcon({
            className: 'custom-start-marker',
            html: '<div style="background-color: #2563eb; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><i class="fas fa-user" style="color: white; font-size: 12px;"></i></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        })
          .addTo(this.map)
          .bindPopup('<b>Você está aqui</b>');
        
        // Atualizar informações da rota
        this.routeInfo.set({
          distance: this.formatDistance(data.distance),
          duration: this.formatDuration(data.duration),
          instructions: data.instructions.map((inst: any) => ({
            text: `${inst.index}. ${this.translateInstruction(inst.instruction)}: ${inst.name}`,
            distance: this.formatDistance(inst.distance),
          })),
        });
        
        console.log('[Route] Rota renderizada com sucesso');
      }
    } catch (error: any) {
      console.error('[Route] Erro ao criar rota:', error);
      // Mantém a distância em linha reta que já foi calculada
    }
  }
  
  private translateInstruction(type: string): string {
    const translations: Record<string, string> = {
      'turn-right': 'Vire à direita',
      'turn-left': 'Vire à esquerda',
      'turn-slight-right': 'Vire levemente à direita',
      'turn-slight-left': 'Vire levemente à esquerda',
      'turn-sharp-right': 'Vire acentuadamente à direita',
      'turn-sharp-left': 'Vire acentuadamente à esquerda',
      'continue': 'Continue',
      'depart': 'Siga',
      'arrive': 'Chegue ao destino',
      'roundabout': 'Entre na rotunda',
      'merge': 'Entre na via',
      'fork': 'Pegue a bifurcação',
      'end-of-road': 'Fim da estrada',
    };
    return translations[type] || type;
  }

  private createRouteWithLeafletRouting(startLat: number, startLng: number, endLat: number, endLng: number): void {
    console.log('[Route] Fallback: usando Leaflet Routing Machine diretamente');
    
    // Verificar se L.Routing está disponível
    if (!L.Routing) {
      console.error('[Route] L.Routing não está disponível! Biblioteca não carregada.');
      return;
    }

    // Remove existing routing control if any
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
    }

    // Create custom plan to hide the default itinerary
    const plan = L.Routing.plan(
      [
        L.latLng(startLat, startLng),
        L.latLng(endLat, endLng)
      ],
      {
        createMarker: (i: number, waypoint: any) => {
          if (i === 0) {
            // Start marker (current location)
            return L.marker(waypoint.latLng, {
              icon: L.divIcon({
                className: 'custom-start-marker',
                html: '<div style="background-color: #2563eb; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><i class="fas fa-user" style="color: white; font-size: 12px;"></i></div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15],
              }),
            }).bindPopup('<b>Você está aqui</b>');
          }
          return null; // Don't show destination marker (already added)
        },
      }
    );

    console.log('[Route] Plan created, creating routing control...');

    // Create custom router with multiple fallback servers
    const customRouter = this.createCustomRouter();

    // Create routing control
    try {
      this.routingControl = L.Routing.control({
        plan: plan,
        router: customRouter,
        lineOptions: {
          styles: [
            { color: '#2563eb', opacity: 0.8, weight: 6 },
          ],
          extendToWaypoints: true,
          missingRouteTolerance: 10,
        },
        show: false, // Hide default itinerary panel
        addWaypoints: false,
        routeWhileDragging: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
      }).addTo(this.map);

      console.log('[Route] Routing control added to map');

      // Listen for route found event
      this.routingControl.on('routesfound', (e: any) => {
        console.log('[Route] Rota detalhada encontrada!', e);
        const routes = e.routes;
        const summary = routes[0].summary;

        // Extract instructions
        const instructions = routes[0].instructions.map((instruction: any) => ({
          text: instruction.text,
          distance: this.formatDistance(instruction.distance),
        }));

        // Update with accurate route info
        this.routeInfo.set({
          distance: this.formatDistance(summary.totalDistance),
          duration: this.formatDuration(summary.totalTime),
          instructions: instructions,
        });
      });

      // Listen for routing error - but don't show error, we already have basic info
      this.routingControl.on('routingerror', (e: any) => {
        console.warn('[Route] Servidores de rota indisponíveis. Usando distância em linha reta.', e);
        // Don't set error - user can still use Google Maps/Waze
      });
    } catch (err) {
      console.error('[Route] Error creating routing control:', err);
      this.error.set('Erro ao inicializar sistema de rotas. Recarregue a página.');
      this.loading.set(false);
    }
  }

  private formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  }

  toggleInstructions(): void {
    this.instructionsExpanded.set(!this.instructionsExpanded());
  }

  retryRoute(): void {
    this.initializeRoute();
  }

  openInGoogleMaps(): void {
    const destLat = this.destinationLatitude();
    const destLng = this.destinationLongitude();
    const current = this.currentLocation();

    if (current) {
      // Open with route from current location
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${current.lat},${current.lng}&destination=${destLat},${destLng}&travelmode=driving`,
        '_blank'
      );
    } else {
      // Open just the destination
      window.open(`https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`, '_blank');
    }
  }

  openInWaze(): void {
    const destLat = this.destinationLatitude();
    const destLng = this.destinationLongitude();
    window.open(`https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`, '_blank');
  }

  startTracking(): void {
    if (!navigator.geolocation) {
      this.error.set('Geolocalização não suportada');
      return;
    }

    console.log('[Route] Iniciando rastreamento em tempo real...');
    this.isTracking.set(true);
    this.error.set(null);

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        const speed = position.coords.speed; // m/s

        console.log('[Route] Nova posição:', newLat, newLng, 'Velocidade:', speed);

        // Update current location
        this.currentLocation.set({ lat: newLat, lng: newLng });

        // Update speed (convert m/s to km/h)
        if (speed !== null && speed > 0) {
          this.currentSpeed.set(Math.round(speed * 3.6));
        } else {
          this.currentSpeed.set(null);
        }

        // Update marker position
        if (this.currentPositionMarker) {
          this.currentPositionMarker.setLatLng([newLat, newLng]);
        } else {
          // Create marker if doesn't exist
          this.currentPositionMarker = L.marker([newLat, newLng], {
            icon: L.divIcon({
              className: 'custom-current-marker',
              html: '<div style="background-color: #2563eb; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(37,99,235,0.5), 0 0 20px rgba(37,99,235,0.3); animation: pulse 2s infinite;"></div><style>@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.8; } }</style>',
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            }),
          }).addTo(this.map).bindPopup('<b>Você está aqui</b><br>Rastreando...');
        }

        // Update remaining distance and time
        this.updateRemainingDistance(newLat, newLng);

        // Center map on current location (optional, can be disabled)
        // this.map.setView([newLat, newLng], this.map.getZoom());
      },
      (error) => {
        console.error('[Route] Erro no rastreamento:', error);
        let errorMessage = 'Erro ao rastrear localização';
        if (error.code === error.TIMEOUT) {
          // Não parar o tracking por timeout, apenas logar
          console.warn('[Route] Timeout no rastreamento, aguardando próxima atualização...');
          return;
        }
        this.error.set(errorMessage);
        this.stopTracking();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000, // Permitir posições de até 5 segundos atrás
        timeout: 15000, // Timeout maior para evitar interrupções
      }
    );
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      console.log('[Route] Parando rastreamento...');
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking.set(false);
      this.currentSpeed.set(null);
    }
  }

  toggleTracking(): void {
    if (this.isTracking()) {
      this.stopTracking();
    } else {
      this.startTracking();
    }
  }

  private updateRemainingDistance(currentLat: number, currentLng: number): void {
    const destLat = this.destinationLatitude();
    const destLng = this.destinationLongitude();

    // Calculate remaining distance
    const remaining = this.calculateDistance(currentLat, currentLng, destLat, destLng);

    // Estimate remaining time based on current speed or default 50 km/h
    const speed = this.currentSpeed() || 50;
    const remainingTime = (remaining / speed) * 3600; // seconds

    // Update route info with remaining distance/time
    const current = this.routeInfo();
    if (current) {
      this.routeInfo.set({
        ...current,
        remainingDistance: this.formatDistance(remaining * 1000),
        remainingTime: this.formatDuration(remainingTime),
      });
    }
  }
}
