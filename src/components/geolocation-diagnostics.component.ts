import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeolocationService } from '../services/geolocation.service';
import { I18nPipe } from '../pipes/i18n.pipe';
import { I18nService } from '../i18n.service';

interface DiagnosticResult {
  category: string;
  status: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details?: string;
}

@Component({
  selector: 'app-geolocation-diagnostics',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed bottom-4 right-4 max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-6 z-50 pointer-events-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">
          🔍 {{ 'geolocationDiagnostics' | i18n }}
        </h3>
        <button
          (click)="toggleDiagnostics()"
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 pointer-events-auto"
          [attr.aria-label]="'close' | i18n"
        >
          <i class="fas fa-times text-lg" aria-hidden="true"></i>
        </button>
      </div>

      @if (isRunning()) {
      <div class="flex items-center justify-center py-4">
        <i class="fas fa-spinner fa-spin text-brand-primary-500 text-2xl mr-3" aria-hidden="true"></i>
        <span class="text-gray-600 dark:text-gray-300">{{ 'running' | i18n }}...</span>
      </div>
      } @else {
      <div class="space-y-3 max-h-96 overflow-y-auto">
        @if (showHttpWarning()) {
        <div class="p-3 rounded-lg border-l-4 bg-orange-50 dark:bg-orange-900/20 border-orange-500 pointer-events-auto">
          <div class="flex items-start gap-3">
            <span class="text-lg text-orange-600 dark:text-orange-400">
              <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
            </span>
            <div class="flex-1">
              <p class="font-semibold text-sm text-gray-900 dark:text-white">⚠️ Aviso HTTP</p>
              <p class="text-sm text-gray-700 dark:text-gray-300">
                Você está em HTTP. Para acesso local, use:
              </p>
              <p class="text-xs bg-gray-100 dark:bg-gray-800 p-2 mt-2 rounded font-mono text-blue-600 dark:text-blue-400 break-all">
                {{ getLocalUrl() }}
              </p>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Clique para copiar a URL correta
              </p>
            </div>
          </div>
        </div>
        }
        @for (result of diagnosticResults(); track result.category) {
        <div
          class="p-3 rounded-lg border-l-4 pointer-events-auto"
          [ngClass]="
            result.status === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
              : result.status === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                : result.status === 'warning'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
          "
        >
          <div class="flex items-start gap-3">
            <span class="text-lg" [ngClass]="getStatusIcon(result.status)">
              <i [ngClass]="getStatusIconClass(result.status)" aria-hidden="true"></i>
            </span>
            <div class="flex-1">
              <p class="font-semibold text-sm text-gray-900 dark:text-white">
                {{ result.category }}
              </p>
              <p class="text-sm text-gray-700 dark:text-gray-300">{{ result.message }}</p>
              @if (result.details) {
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono">
                {{ result.details }}
              </p>
              }
            </div>
          </div>
        </div>
        }
      </div>

      <div class="mt-4 flex gap-2">
        <button
          (click)="runDiagnostics()"
          class="flex-1 px-3 py-2 bg-brand-primary-500 hover:bg-brand-primary-600 text-white text-sm font-medium rounded-lg transition-colors pointer-events-auto"
          [disabled]="isRunning()"
        >
          <i class="fas fa-redo mr-2" aria-hidden="true"></i>
          {{ 'retest' | i18n }}
        </button>
        <button
          (click)="requestPermission()"
          class="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors pointer-events-auto"
          [disabled]="isRunning()"
        >
          <i class="fas fa-map-marker-alt mr-2" aria-hidden="true"></i>
          {{ 'enableLocation' | i18n }}
        </button>
      </div>
      }
    </div>
  `,
})
export class GeolocationDiagnosticsComponent {
  private readonly geolocationService = inject(GeolocationService);
  private readonly i18n = inject(I18nService);

  private readonly _isRunning = signal(false);
  readonly isRunning = this._isRunning.asReadonly();

  private readonly _diagnosticResults = signal<DiagnosticResult[]>([]);
  readonly diagnosticResults = this._diagnosticResults.asReadonly();

  constructor() {
    effect(() => {
      if (!this._isRunning() && this._diagnosticResults().length === 0) {
        this.runDiagnostics();
      }
    });
  }

  async runDiagnostics() {
    this._isRunning.set(true);
    const results: DiagnosticResult[] = [];

    try {
      await this.checkApiAvailability(results);
      
      if (results.some(r => r.status === 'error' && r.category === 'API Disponível')) {
        this._diagnosticResults.set(results);
        this._isRunning.set(false);
        return;
      }

      await this.checkHttps(results);
      await this.checkNetworkConnection(results);
      await this.checkLocationCapability(results);
      await this.checkTrackingStatus(results);
    } catch (error) {
      results.push({
        category: 'Erro',
        status: 'error',
        message: 'Exceção durante diagnósticos',
        details: String(error),
      });
    }

    this._diagnosticResults.set(results);
    this._isRunning.set(false);
  }

  private async checkApiAvailability(results: DiagnosticResult[]): Promise<void> {
    const isAvailable = this.geolocationService.isGeolocationAvailable();
    results.push({
      category: 'API Disponível',
      status: isAvailable ? 'success' : 'error',
      message: isAvailable
        ? 'Geolocation API está disponível'
        : 'Geolocation API não está disponível no navegador',
    });
  }

  private async checkHttps(results: DiagnosticResult[]): Promise<void> {
    const isHttps = globalThis.location?.protocol === 'https:';
    const isLocalhost = globalThis.location?.hostname === 'localhost' || globalThis.location?.hostname === '127.0.0.1';
    const isSecure = isHttps || isLocalhost;
    const message = this.getHttpsMessage(isHttps, isLocalhost);
    
    results.push({
      category: 'Protocolo HTTPS',
      status: isSecure ? 'success' : 'error',
      message,
      details: `Protocolo: ${globalThis.location?.protocol} | Host: ${globalThis.location?.hostname}`,
    });
  }

  private getHttpsMessage(isHttps: boolean, isLocalhost: boolean): string {
    if (isHttps) {
      return 'Usando HTTPS (obrigatório para geolocalização)';
    }
    if (isLocalhost) {
      return 'Localhost detectado (tratado como seguro para desenvolvimento)';
    }
    return 'NÃO está usando HTTPS. Geolocalização pode não funcionar.';
  }

  private async checkNetworkConnection(results: DiagnosticResult[]): Promise<void> {
    const isOnline = navigator.onLine;
    results.push({
      category: 'Conexão de Rede',
      status: isOnline ? 'success' : 'error',
      message: isOnline ? 'Conectado à internet' : 'Desconectado da internet',
    });
  }

  private async checkLocationCapability(results: DiagnosticResult[]): Promise<void> {
    const startTime = Date.now();
    const location = await this.geolocationService.getCurrentLocation(false);
    const elapsed = Date.now() - startTime;

    if (location) {
      results.push({
        category: 'Localização Obtida',
        status: 'success',
        message: `Localização capturada com sucesso em ${elapsed}ms`,
        details: `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}, Precisão: ±${location.accuracy.toFixed(0)}m`,
      });
    } else {
      const error = this.geolocationService.locationError();
      results.push({
        category: 'Localização Obtida',
        status: 'error',
        message: 'Falha ao obter localização',
        details: error?.message || 'Erro desconhecido',
      });

      if (error?.code === 1) {
        results.push({
          category: 'Recomendação',
          status: 'info',
          message: 'Permissão de geolocalização foi negada',
          details:
            'Clique em "Ativar Localização" ou verifique as configurações de permissão do navegador',
        });
      } else if (error?.code === 3) {
        results.push({
          category: 'Recomendação',
          status: 'warning',
          message: 'Timeout ao obter localização',
          details:
            'O navegador demorou demais. Tente em um local com melhor sinal de GPS/WiFi',
        });
      }
    }
  }

  private async checkTrackingStatus(results: DiagnosticResult[]): Promise<void> {
    const isTracking = this.geolocationService.isTracking();
    results.push({
      category: 'Rastreamento',
      status: isTracking ? 'info' : 'warning',
      message: isTracking ? 'Rastreamento contínuo ativo' : 'Rastreamento contínuo inativo',
    });
  }

  requestPermission() {
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' } as PermissionDescriptor)
        .then((result) => {
          console.log('Geolocation permission status:', result.state);
          if (result.state === 'prompt') {
            // Solicitar novamente
            this.geolocationService.getCurrentLocation(true);
          }
        })
        .catch((error) => {
          console.error('Erro ao verificar permissão:', error);
          // Tentar obter localização mesmo assim
          this.geolocationService.getCurrentLocation(true);
        });
    } else {
      // Fallback: tentar obter localização
      this.geolocationService.getCurrentLocation(true);
    }
  }

  toggleDiagnostics() {
    // Implementar ocultação se necessário
  }

  showHttpWarning() {
    const protocol = globalThis.location?.protocol;
    const hostname = globalThis.location?.hostname;
    const isHttp = protocol === 'http:';
    const isNotLocalhost = hostname !== 'localhost' && hostname !== '127.0.0.1';
    return isHttp && isNotLocalhost;
  }

  getLocalUrl(): string {
    const port = globalThis.location?.port || '';
    const portStr = port ? `:${port}` : '';
    const pathname = globalThis.location?.pathname || '/';
    return `https://localhost${portStr}${pathname}`;
  }

  private getStatusIconColor(status: string): string {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  }

  getStatusIcon(status: string): string {
    return this.getStatusIconColor(status);
  }

  private getIconForStatus(status: string): string {
    switch (status) {
      case 'success':
        return 'fas fa-check-circle';
      case 'error':
        return 'fas fa-times-circle';
      case 'warning':
        return 'fas fa-exclamation-circle';
      default:
        return 'fas fa-info-circle';
    }
  }

  getStatusIconClass(status: string): string {
    return this.getIconForStatus(status);
  }
}
