
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { LeafletMapViewerComponent } from "@/src/components/leaflet-map-viewer.component";
import { LeafletRouteMapComponent } from "@/src/components/leaflet-route-map.component";
import { I18nPipe } from "@/src/pipes/i18n.pipe";
import { AuthService } from "@/src/services/auth.service";
import { DataService } from "@/src/services/data.service";
import { GeolocationService } from "@/src/services/geolocation.service";
import { NotificationService } from "@/src/services/notification.service";
import { PortugalAddressDatabaseService } from "@/src/services/portugal-address-database.service";
import { ServiceRequest } from "@/src/models/maintenance.models";
import { extractPtAddressParts } from "@/src/utils/address-utils";
import { I18nService } from "@/src/i18n.service";

@Component({
  selector: "app-service-request-geolocation",
  standalone: true,
  imports: [
    I18nPipe,
    LeafletMapViewerComponent,
    LeafletRouteMapComponent
],
  templateUrl: "./service-request-geolocation.component.html",
  styleUrls: ["./service-request-geolocation.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestGeolocationComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dataService = inject(DataService);
  private readonly authService = inject(AuthService);
  readonly geolocationService = inject(GeolocationService);
  private readonly addressService = inject(PortugalAddressDatabaseService);
  private readonly notificationService = inject(NotificationService);
  private readonly i18n = inject(I18nService);

  private readonly requestId = signal<number | null>(null);
  private readonly navigationRequest = signal<ServiceRequest | null>(null);

  readonly showRouteMap = signal(false);
  readonly enableUserTracking = signal(false);
  readonly postalCodeCoordinates = signal<{ latitude: number; longitude: number } | null>(null);

  constructor() {
    const idParam = this.route.snapshot.paramMap.get("id");
    this.requestId.set(this.parseId(idParam));

    const navigationState =
      this.router.currentNavigation?.()?.extras?.state ??
      (globalThis.history?.state ?? null);
    if (navigationState?.request) {
      this.navigationRequest.set(navigationState.request as ServiceRequest);
    }

    if (!this.requestId()) {
      this.notificationService.addNotification(
        this.i18n.translate("noRequestSelected") ||
          "Solicitação não encontrada."
      );
    }
  }

  private readonly reloadEffect = effect(() => {
    if (!this.dataService.serviceRequests().length) {
      this.dataService.reloadServiceRequests();
    }
  });

  private parseId(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  readonly currentUser = computed(() => this.authService.appUser());

  readonly request = computed(() => {
    const id = this.requestId();
    const fromState = this.navigationRequest();
    if (!id) {
      return fromState;
    }
    const fromStore = this.dataService
      .serviceRequests()
      .find((req) => req.id === id);
    return fromStore ?? (fromState?.id === id ? fromState : null);
  });

  private readonly addressParts = computed(() =>
    extractPtAddressParts(this.request() || {})
  );

  readonly hasCoordinates = computed(() =>
    !!(this.serviceLatitude() && this.serviceLongitude())
  );

  private readonly coordinatesEffect = effect(async () => {
    const postalCode = this.addressParts().postalCode;
    const currentRequest = this.request();

    if (!postalCode || !currentRequest) {
      this.postalCodeCoordinates.set(null);
      return;
    }

    try {
      const result = await this.addressService.validateCodigoPostal(postalCode);
      if (result.valid && result.endereco?.latitude && result.endereco?.longitude) {
        this.postalCodeCoordinates.set({
          latitude: result.endereco.latitude,
          longitude: result.endereco.longitude,
        });
      } else {
        this.postalCodeCoordinates.set(null);
      }
    } catch {
      this.postalCodeCoordinates.set(null);
    }
  });

  readonly serviceLatitude = computed(() => {
    const req = this.request();
    if (!req) return null;
    return req.latitude || this.postalCodeCoordinates()?.latitude || null;
  });

  readonly serviceLongitude = computed(() => {
    const req = this.request();
    if (!req) return null;
    return req.longitude || this.postalCodeCoordinates()?.longitude || null;
  });

  private readonly distanceToService = computed(() => {
    const userLoc = this.geolocationService.userLocation();
    const lat = this.serviceLatitude();
    const lng = this.serviceLongitude();

    if (!userLoc || !lat || !lng) {
      return null;
    }

    return this.geolocationService.calculateDistance(
      userLoc.latitude,
      userLoc.longitude,
      lat,
      lng
    );
  });

  readonly formattedDistance = computed(() => {
    const distance = this.distanceToService();
    if (!distance) return null;
    return this.geolocationService.formatDistance(distance);
  });

  readonly userLocationDisplay = computed(() => {
    const location = this.geolocationService.userLocation();
    if (!location) return null;
    return {
      latitude: location.latitude.toFixed(6),
      longitude: location.longitude.toFixed(6),
      accuracy: location.accuracy.toFixed(0),
    };
  });

  readonly locationError = computed(() =>
    this.geolocationService.locationError()
  );

  private readonly trackingEffect = effect(() => {
    if (!this.enableUserTracking()) {
      if (this.geolocationService.isTracking()) {
        this.geolocationService.stopTracking();
      }
      return;
    }

    if (!this.geolocationService.isGeolocationAvailable()) {
      this.notificationService.addNotification(
        this.i18n.translate("enableLocationTracking") ||
          "Ative a geolocalização no navegador."
      );
      this.enableUserTracking.set(false);
      return;
    }

    this.geolocationService.startTracking(false);
  });

  handleBack(): void {
    const user = this.currentUser();
    if (user?.role === "admin") {
      this.router.navigate(["/admin/requests"]);
    } else {
      this.router.navigate(["/"]);
    }
  }

  getResponsiveMapHeight(): string {
    try {
      const windowWidth = globalThis.window.innerWidth;
      if (windowWidth < 640) {
        return "320px";
      }
      if (windowWidth < 1024) {
        return "420px";
      }
      return "520px";
    } catch {
      return "520px";
    }
  }

  ngOnDestroy(): void {
    if (this.geolocationService.isTracking()) {
      this.geolocationService.stopTracking();
    }
  }
}
