import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { I18nService } from '../i18n.service';
import { PortugalAddressDatabaseService } from './portugal-address-database.service';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationError {
  code: number;
  message: string;
}

export interface ReverseGeocodeResult {
  address?: string;
  locality?: string;
  district?: string;
  country?: string;
}

@Injectable({ providedIn: 'root' })
export class GeolocationService implements OnDestroy {
  private readonly i18n = inject(I18nService);
  private readonly addressDatabase = inject(PortugalAddressDatabaseService);

  // Signals para coordenadas fixas (legado - compatibilidade)
  private readonly _latitude = signal<number|null>(null);
  private readonly _longitude = signal<number|null>(null);
  latitude = this._latitude.asReadonly();
  longitude = this._longitude.asReadonly();

  // Signals para localização do usuário em tempo real
  private readonly _userLocation = signal<UserLocation | null>(null);
  readonly userLocation = this._userLocation.asReadonly();

  // Signal para armazenar erros de geolocalização
  private readonly _locationError = signal<LocationError | null>(null);
  readonly locationError = this._locationError.asReadonly();

  // Signal para armazenar endereço reverso geocodificado
  private readonly _reverseGeocode = signal<ReverseGeocodeResult | null>(null);
  readonly reverseGeocode = this._reverseGeocode.asReadonly();

  // Signal para estado de rastreamento
  private readonly _isTracking = signal(false);
  readonly isTracking = this._isTracking.asReadonly();

  // ID do watch position para poder cancelar depois
  private watchPositionId: number | null = null;

  // Controlar tempo da última chamada de reverse geocoding para evitar chamadas muito frequentes
  private lastReverseGeocodeTime = 0;
  private readonly REVERSE_GEOCODE_INTERVAL = 10000; // 10 segundos

  /**
   * Método legado - mantém compatibilidade com código existente
   */
  setCoordinates(lat: number, lng: number) {
    this._latitude.set(lat);
    this._longitude.set(lng);
  }

  /**
   * Verifica se a API de geolocalização está disponível
   */
  isGeolocationAvailable(): boolean {
    return globalThis.navigator !== undefined && !!globalThis.navigator.geolocation;
  }

  /**
   * Obtém a localização do usuário uma única vez
   * @param enableHighAccuracy Se true, tenta obter maior precisão (consome mais bateria)
   * @returns Promise com a localização ou erro
   */
  async getCurrentLocation(enableHighAccuracy = false): Promise<UserLocation | null> {
    return new Promise((resolve) => {
      if (!this.isGeolocationAvailable()) {
        const error: LocationError = {
          code: 0,
          message: 'Geolocalização não disponível no navegador. Use HTTPS e verifique as permissões.'
        };
        this._locationError.set(error);
        console.error('[GeolocationService] Geolocalização não disponível');
        resolve(null);
        return;
      }

      this._isTracking.set(true);
      console.log('[GeolocationService] Obtendo localização única com enableHighAccuracy:', enableHighAccuracy);

      try {
        globalThis.navigator.geolocation.getCurrentPosition(
          (position) => {
            const location: UserLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            };
            this._userLocation.set(location);
            this._locationError.set(null);
            this._isTracking.set(false);
            console.log('[GeolocationService] Localização obtida com sucesso:', {
              lat: location.latitude.toFixed(6),
              lng: location.longitude.toFixed(6),
              accuracy: location.accuracy.toFixed(0)
            });
            
            // Fazer reverse geocoding para obter o endereço
            this.reverseGeocodeLocation(location.latitude, location.longitude);
            
            resolve(location);
          },
          (error) => {
            let message = '';
            
            switch (error.code) {
              case error.PERMISSION_DENIED:
                message = 'Permissão de geolocalização negada. Verifique as configurações do navegador.';
                console.error('[GeolocationService] PERMISSION_DENIED');
                break;
              case error.POSITION_UNAVAILABLE:
                message = 'Sua posição não está disponível. Verifique sua conexão GPS/WiFi.';
                console.error('[GeolocationService] POSITION_UNAVAILABLE');
                break;
              case error.TIMEOUT:
                message = 'Timeout ao obter sua localização. Tente novamente em um local com melhor sinal.';
                console.error('[GeolocationService] TIMEOUT');
                break;
              default:
                message = `Erro na geolocalização: ${error.message || 'Desconhecido'}`;
                console.error('[GeolocationService] Erro:', error);
            }
            
            const locationError: LocationError = {
              code: error.code,
              message
            };
            this._locationError.set(locationError);
            this._isTracking.set(false);
            console.warn('[GeolocationService] Erro ao obter localização:', locationError);
            resolve(null);
          },
          {
            enableHighAccuracy,
            timeout: 15000, // Aumentado para 15s
            maximumAge: enableHighAccuracy ? 0 : 5000 // Sem cache se alta precisão
          }
        );
      } catch (error) {
        console.error('[GeolocationService] Exceção ao chamar getCurrentPosition:', error);
        this._locationError.set({
          code: 0,
          message: 'Erro ao inicializar geolocalização'
        });
        this._isTracking.set(false);
        resolve(null);
      }
    });
  }

  /**
   * Inicia o rastreamento contínuo da localização do usuário
   * @param enableHighAccuracy Se true, tenta obter maior precisão
   */
  startTracking(enableHighAccuracy = false): void {
    if (!this.isGeolocationAvailable()) {
      this._locationError.set({
        code: 0,
        message: 'Geolocalização não disponível no seu navegador'
      });
      console.error('[GeolocationService] Geolocalização não disponível');
      return;
    }

    // Se já está rastreando, não fazer nada
    if (this.watchPositionId !== null) {
      console.log('[GeolocationService] Rastreamento já ativo');
      return;
    }

    console.log('[GeolocationService] Iniciando rastreamento com enableHighAccuracy:', enableHighAccuracy);
    this._isTracking.set(true);

    try {
      this.watchPositionId = globalThis.navigator.geolocation.watchPosition(
        (position) => {
          const location: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          this._userLocation.set(location);
          this._locationError.set(null);
          console.log('[GeolocationService] Localização obtida com sucesso:', {
            lat: location.latitude.toFixed(6),
            lng: location.longitude.toFixed(6),
            accuracy: location.accuracy.toFixed(0),
            timestamp: new Date(location.timestamp).toISOString()
          });
          
          // Fazer reverse geocoding com debounce (máximo a cada 10 segundos)
          const now = Date.now();
          if (now - this.lastReverseGeocodeTime > this.REVERSE_GEOCODE_INTERVAL) {
            this.lastReverseGeocodeTime = now;
            this.reverseGeocodeLocation(location.latitude, location.longitude);
          }
        },
        (error) => {
          let message: string;
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Permissão negada. Habilite a geolocalização nas configurações do navegador.';
              console.error('[GeolocationService] Permissão negada pelo usuário');
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Posição indisponível. Verifique sua conexão de rede.';
              console.error('[GeolocationService] Posição indisponível');
              break;
            case error.TIMEOUT:
              message = 'Timeout ao obter posição. Tente novamente.';
              console.error('[GeolocationService] Timeout - localização demorou demais');
              break;
            default:
              message = `Erro: ${error.message || 'Desconhecido'}`;
              console.error('[GeolocationService] Erro:', error);
          }
          
          const locationError: LocationError = {
            code: error.code,
            message
          };
          this._locationError.set(locationError);
          this._isTracking.set(false);
          console.warn('[GeolocationService] Erro ao rastrear:', locationError);
        },
        {
          enableHighAccuracy: enableHighAccuracy,
          timeout: 15000, // Aumentado para 15s
          maximumAge: enableHighAccuracy ? 0 : 5000 // Sem cache se alta precisão
        }
      );
    } catch (error) {
      console.error('[GeolocationService] Exceção ao iniciar watchPosition:', error);
      this._locationError.set({
        code: 0,
        message: 'Erro ao inicializar geolocalização'
      });
      this._isTracking.set(false);
    }
  }

  /**
   * Para o rastreamento de localização
   */
  stopTracking(): void {
    if (this.watchPositionId !== null) {
      console.log('[GeolocationService] Parando rastreamento');
      globalThis.navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
      this._isTracking.set(false);
    }
  }

  /**
   * Limpa todos os dados de localização
   */
  clear() {
    this.stopTracking();
    this._latitude.set(null);
    this._longitude.set(null);
    this._userLocation.set(null);
    this._locationError.set(null);
  }

  /**
   * Calcula a distância entre dois pontos usando a fórmula de Haversine
   * @param lat1 Latitude do ponto 1
   * @param lon1 Longitude do ponto 1
   * @param lat2 Latitude do ponto 2
   * @param lon2 Longitude do ponto 2
   * @returns Distância em quilômetros
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distância em km
  }

  /**
   * Formata distância para exibição
   * @param distance Distância em km
   * @returns String formatada
   */
  formatDistance(distance: number): string {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  }

  /**
   * Converte graus para radianos
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Diagnóstico de geolocalização - verifica o suporte e realiza testes
   */
  async runDiagnostics(): Promise<Record<string, any>> {
    console.log('[GeolocationService] Iniciando diagnósticos...');
    
    const diagnostics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      isGeolocationAvailable: this.isGeolocationAvailable(),
      navigator: {
        userAgent: globalThis.navigator?.userAgent || 'N/A',
        onLine: globalThis.navigator?.onLine || false,
        permissions: 'N/A'
      },
      https: globalThis.location === undefined ? 'N/A' : globalThis.location.protocol === 'https:',
      geolocationTest: null
    };

    // Verificar se está em HTTPS
    console.log('[GeolocationService] Protocolo:', diagnostics.https);
    
    if (!this.isGeolocationAvailable()) {
      console.warn('[GeolocationService] Geolocalização não disponível');
      diagnostics.issue = 'Geolocalização não suportada pelo navegador';
      return diagnostics;
    }

    // Tentar obter localização para teste
    try {
      const testLocation = await this.getCurrentLocation(false);
      if (testLocation) {
        diagnostics.geolocationTest = {
          success: true,
          latitude: testLocation.latitude,
          longitude: testLocation.longitude,
          accuracy: testLocation.accuracy
        };
        console.log('[GeolocationService] Teste de geolocalização bem-sucedido:', testLocation);
      } else {
        const error = this.locationError();
        diagnostics.geolocationTest = {
          success: false,
          error: error?.message || 'Erro desconhecido'
        };
        console.warn('[GeolocationService] Teste de geolocalização falhou:', diagnostics.geolocationTest);
      }
    } catch (error) {
      diagnostics.geolocationTest = {
        success: false,
        error: String(error)
      };
      console.error('[GeolocationService] Exceção durante teste:', error);
    }

    console.log('[GeolocationService] Diagnósticos completos:', diagnostics);
    return diagnostics;
  }

  /**
   * Retorna mensagem de erro amigável baseada no código de erro
   */
  private getErrorMessage(errorCode: number): string {
    switch (errorCode) {
      case 1: // PERMISSION_DENIED
        return 'Permissão de geolocalização negada. Ative nas configurações do navegador.';
      case 2: // POSITION_UNAVAILABLE
        return 'Sua localização não pôde ser determinada.';
      case 3: // TIMEOUT
        return 'Timeout ao obter sua localização.';
      default:
        return 'Erro desconhecido ao obter localização.';
    }
  }

  /**
   * Faz reverse geocoding da localização para obter o endereço
   * Usa o banco de dados local português para máxima precisão
   */
  async reverseGeocodeLocation(latitude: number, longitude: number): Promise<ReverseGeocodeResult | null> {
    try {
      console.log('[GeolocationService] Iniciando reverse geocoding para:', latitude, longitude);
      
      // Buscar todos os códigos postais e encontrar o mais próximo
      const allPostalCodes = await this.addressDatabase.getAllCodigoPostais();
      
      if (!allPostalCodes || allPostalCodes.length === 0) {
        console.warn('[GeolocationService] Nenhum código postal encontrado no banco de dados');
        return null;
      }

      // Calcular a distância até cada código postal usando Haversine
      const postalCodesWithDistance = allPostalCodes
        .filter(pc => pc.latitude != null && pc.longitude != null)
        .map(pc => ({
          ...pc,
          distance: this.calculateHaversineDistance(
            latitude, 
            longitude, 
            pc.latitude, 
            pc.longitude
          )
        }))
        .sort((a, b) => a.distance - b.distance);

      // Pegar o código postal mais próximo
      const closest = postalCodesWithDistance[0];
      
      if (!closest || closest.distance > 5000) {
        console.warn('[GeolocationService] Endereço mais próximo está a mais de 5km');
        return null;
      }

      console.log('[GeolocationService] Endereço encontrado:', {
        locality: closest.nome_localidade,
        district: closest.distrito,
        distance: `${(closest.distance / 1000).toFixed(2)}km`,
        postalCode: closest.codigo_postal_completo
      });

      const result: ReverseGeocodeResult = {
        address: `${closest.nome_localidade}, ${closest.codigo_postal_completo}`,
        locality: closest.nome_localidade || '',
        district: closest.distrito || '',
        country: 'Portugal'
      };

      this._reverseGeocode.set(result);
      return result;
    } catch (error) {
      console.error('[GeolocationService] Erro ao fazer reverse geocoding:', error);
      this._reverseGeocode.set(null);
      return null;
    }
  }

  /**
   * Calcula a distância entre dois pontos usando a fórmula de Haversine
   * Retorna a distância em metros
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Raio da Terra em metros
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distância em metros
  }

  /**
   * Destroi o serviço
   */
  ngOnDestroy(): void {
    this.clear();
  }
}
