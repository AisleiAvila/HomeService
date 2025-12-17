import {
  Component,
  ChangeDetectionStrategy,
  input,
  Output,
  EventEmitter,
  computed,
  inject,
  signal,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import {
  ServiceRequest,
  User,
  ServiceStatus,
} from "@/src/models/maintenance.models";
import { I18nService } from "@/src/i18n.service";

// Tipos específicos para ações
type ActionType = 'schedule' | 'start' | 'complete' | 'pay' | 'chat';
type ActionClass = 'primary' | 'secondary' | 'success' | 'danger';

interface ServiceAction {
  type: ActionType;
  label: string;
  class: ActionClass;
  loading: boolean;
}

// Estado de carregamento com granularidade
interface LoadingState {
  main: boolean;
  coordinates: boolean;
  quotes: boolean;
}
import { StatusUtilsService } from "@/src/utils/status-utils.service";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { TimeControlComponent } from "../time-control/time-control.component";
import { WorkflowTimelineComponent } from "../workflow-timeline/workflow-timeline.component";
import { ServiceClarificationsComponent } from "../service-clarifications/service-clarifications.component";
import { NotificationService } from "../../services/notification.service";
import { DataService } from "../../services/data.service";
import { AuthService } from "../../services/auth.service";
import { WorkflowServiceSimplified } from "../../services/workflow-simplified.service";
import { extractPtAddressParts } from "@/src/utils/address-utils";
import { LeafletMapViewerComponent } from "../leaflet-map-viewer.component";
import { LeafletRouteMapComponent } from "../leaflet-route-map.component";
import { PortugalAddressDatabaseService } from "../../services/portugal-address-database.service";
import { ServiceImagesComponent } from "../service-images/service-images.component";

@Component({
  selector: "app-service-request-details",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    I18nPipe,
    TimeControlComponent,
    WorkflowTimelineComponent,
    ServiceClarificationsComponent,
    LeafletMapViewerComponent,
    LeafletRouteMapComponent,
    ServiceImagesComponent,
  ],
  template: `
    @if (!request()) {
    <div class="bg-red-100 text-red-700 p-4 rounded text-center font-semibold" role="alert" aria-live="polite">
      <h3 class="text-xl font-bold mb-2">❌ {{ 'error' | i18n }}</h3>
      {{ 'noRequestSelected' | i18n }}<br />
      {{ 'selectValidRequest' | i18n }}
    </div>
    } @else {
    <!-- Cabeçalho com gradiente, ícone e título -->
    <header class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-brand-primary-500 to-brand-primary-600" role="banner">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-white flex items-center">
            <i class="fas fa-file-alt mr-3" aria-hidden="true"></i>
            {{ "serviceRequestDetails" | i18n }}
          </h2>
          <p class="text-brand-primary-200 text-sm mt-1" [attr.aria-label]="'serviceTitle' | i18n : { title: request().title }">
            {{ request().title }}
          </p>
        </div>
        <button
          (click)="logAndEmitCloseDetails()"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-brand-primary-500 dark:text-brand-primary-400 text-sm font-medium rounded-lg hover:bg-brand-primary-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-primary-500 transition-all transform hover:scale-105 shadow-lg dark:shadow-gray-900 sm:w-auto w-full"
          [attr.aria-label]="'backToList' | i18n"
        >
          <i class="fas fa-arrow-left" aria-hidden="true"></i>
          <span>{{ 'backToList' | i18n }}</span>
        </button>
      </div>
    </header>

    <!-- Conteúdo Principal -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" role="main">
      @if (request()) {
      <div class="space-y-6">
        <!-- Workflow Timeline -->
        <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6" role="region" [attr.aria-label]="'workflowTimeline' | i18n">
          <app-workflow-timeline
            [serviceRequest]="request()"
            role="complementary"
          ></app-workflow-timeline>
        </section>

        <!-- Professional Responses / Respostas dos Profissionais -->
        @if (professionalQuotes().length > 0) {
        <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6" role="region" [attr.aria-label]="'professionalResponses' | i18n">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4" id="professional-quotes-title">
            {{ "professionalResponses" | i18n }}
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2" aria-label="professionalResponsesCount">
              ({{ professionalQuotes().length }} {{ professionalQuotes().length === 1 ? ('response' | i18n) : ('responses' | i18n) }})
            </span>
          </h3>
          <div class="space-y-4" [attr.aria-labelledby]="'professional-quotes-title'">
            @for (quote of professionalQuotes(); track quote.professional_id) {
            <article 
              class="border rounded-lg p-4 transition-all"
              [class.border-green-500]="quote.isSelected"
              [class.bg-green-50]="quote.isSelected"
              [class.dark:bg-green-900]="quote.isSelected"
              [class.border-gray-200]="!quote.isSelected"
              [class.dark:border-gray-700]="!quote.isSelected"
              [attr.aria-label]="'professionalQuote' | i18n : { name: quote.professional_name }"
            >
              <!-- Cabeçalho da resposta -->
              <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                <div class="flex items-center space-x-3 mb-2 sm:mb-0">
                  @if (quote.professional_avatar_url) {
                  <img 
                    [src]="quote.professional_avatar_url" 
                    [alt]="quote.professional_name"
                    class="w-10 h-10 rounded-full object-cover"
                    loading="lazy"
                  >
                  } @else {
                  <div class="w-10 h-10 rounded-full bg-brand-primary-100 flex items-center justify-center" aria-hidden="true">
                    <i class="fas fa-user text-brand-primary-600"></i>
                  </div>
                  }
                  <div>
                    <h4 class="font-medium text-gray-800 dark:text-gray-100">
                      {{ quote.professional_name || ("professional" | i18n) }}
                    </h4>
                    @if (quote.professional_rating) {
                    <div class="flex items-center mt-1" [attr.aria-label]="'professionalRating' | i18n : { rating: quote.professional_rating.toFixed(1) }">
                      <i class="fas fa-star text-yellow-400 text-xs" aria-hidden="true"></i>
                      <span class="text-xs text-gray-600 ml-1">{{ quote.professional_rating.toFixed(1) }}</span>
                    </div>
                    }
                  </div>
                </div>
                
                <div class="flex items-center space-x-2">
                  @if (quote.isSelected) {
                  <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800" role="status">
                    <i class="fas fa-check-circle mr-1" aria-hidden="true"></i>
                    {{ "selected" | i18n }}
                  </span>
                  }
                  @if (quote.isLowest && quote.hasQuote) {
                  <span class="px-2 py-1 text-xs font-medium rounded-full bg-brand-primary-100 text-brand-primary-800">
                    <i class="fas fa-award mr-1" aria-hidden="true"></i>
                    {{ "lowestQuote" | i18n }}
                  </span>
                  }
                  <span [class]="getResponseStatusClass(quote.response_status)">
                    {{ quote.response_status | i18n }}
                  </span>
                </div>
              </div>

              <!-- Botões de ação para admin - SIMPLIFICADO: apenas seleção de profissional -->
              @if (currentUser().role === "admin" && (quote.response_status === "responded" || quote.response_status === "accepted") && !quote.isSelected) {
              <div class="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  (click)="selectSpecificProfessional(quote.professional_id)"
                  class="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  [attr.aria-label]="'selectProfessionalAction' | i18n : { name: quote.professional_name }"
                >
                  <i class="fas fa-check mr-2" aria-hidden="true"></i>
                  {{ "selectProfessional" | i18n }}
                </button>
              </div>
              }
            </article>
            }
          </div>
        </section>
        }

        <!-- Service Request Details Card -->
        <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6" role="region" [attr.aria-label]="'requestInformation' | i18n">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4" id="request-info-title">
            {{ "requestInformation" | i18n }}
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6" [attr.aria-labelledby]="'request-info-title'">
            <!-- Left Column -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="title-label">
                  {{ "title" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'title-label'">{{ request().title }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="description-label">
                  {{ "description" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'description-label'">{{ request().description }}</p>
              </div>
              @if (request().origin) {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="origin-label">
                  {{ "origin" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'origin-label'">{{ request().origin?.name || '—' }}</p>
              </div>
              }
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="category-label">
                  {{ "category" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'category-label'">{{ request().category?.name || '—' }}</p>
              </div>
              @if (request().subcategory) {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="subcategory-label">
                  {{ "subcategory" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'subcategory-label'">{{ request().subcategory?.name || '—' }}</p>
              </div>
              }
              @if (currentUser().role === "admin") {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="total-value-label">
                  {{ "TotalValue" | i18n }}
                </label>
                <p class="text-lg font-semibold text-green-600" [attr.aria-labelledby]="'total-value-label'">
                  @if (request().valor && request().valor > 0) {
                    €{{ request().valor | number : '1.2-2' }}
                  } @else {
                    —
                  }
                </p>
              </div>
              }
              @if (shouldShowProviderValue()) {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="professional-value-label">
                  {{ "valorPrestador" | i18n }}
                </label>
                <p class="text-lg font-semibold text-brand-primary-600" [attr.aria-labelledby]="'professional-value-label'">
                  @if (request().valor_prestador && request().valor_prestador > 0) {
                    €{{ request().valor_prestador | number : '1.2-2' }}
                  } @else {
                    —
                  }
                </p>
              </div>
              }
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="priority-label">
                  {{ "priority" | i18n }}
                </label>
                <span [class]="getPriorityClass(request().priority)" [attr.aria-labelledby]="'priority-label'">
                  {{ request().priority | i18n }}
                </span>
              </div>
            </div>

            <!-- Right Column -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="status-label">
                  {{ "status" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'status-label'" role="status">{{ request().status || '—' }}</p>
              </div>

              @if (request().professional_name) {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="professional-label">
                  {{ "professionalName" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'professional-label'">
                  {{
                    request().professional_name || ("nameNotAvailable" | i18n)
                  }}
                </p>
              </div>
              } @if (request().cost) {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="cost-label">
                  {{ "cost" | i18n }}
                </label>
                <p class="text-lg font-semibold text-green-600" [attr.aria-labelledby]="'cost-label'">
                  €{{ request().cost | number : "1.2-2" }}
                </p>
              </div>
              }

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="created-at-label">
                  {{ "createdAt" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'created-at-label'">
                  @if (request().created_at) {
                    {{ request().created_at | date : "dd/MM/yyyy HH:mm" }}
                  } @else if (request().requested_date) {
                    {{ request().requested_date | date : "dd/MM/yyyy HH:mm" }}
                  } @else {
                    —
                  }
                </p>
              </div>

              @if (request().scheduled_date) {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="scheduled-date-label">
                  {{ "scheduledDate" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'scheduled-date-label'">
                  {{ request().scheduled_date | date : "short" }}
                </p>
              </div>
              }
            </div>
          </div>
        </section>

        <!-- Requester Information -->
        @if (request().client_name || request().client_phone || request().client_nif || request().email_client) {
        <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6" role="region" [attr.aria-label]="'requesterInformation' | i18n">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4" id="requester-info-title">
            {{ "requesterInformation" | i18n }}
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'requester-info-title'">
            @if (request().client_name) {
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="client-name-label">
                <i class="fas fa-user text-brand-primary-500 mr-1" aria-hidden="true"></i>
                {{ 'client' | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'client-name-label'">{{ request().client_name }}</p>
            </div>
            }
            @if (request().client_phone) {
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="client-phone-label">
                <i class="fas fa-phone text-brand-primary-500 mr-1" aria-hidden="true"></i>
                {{ 'phone' | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'client-phone-label'">{{ request().client_phone }}</p>
            </div>
            }
            @if (request().client_nif) {
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="client-nif-label">
                <i class="fas fa-id-card text-brand-primary-500 mr-1" aria-hidden="true"></i>
                {{ 'nif' | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'client-nif-label'">{{ request().client_nif }}</p>
            </div>
            }
            @if (request().email_client) {
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="client-email-label">
                <i class="fas fa-envelope text-brand-primary-500 mr-1" aria-hidden="true"></i>
                {{ 'email' | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'client-email-label'">{{ request().email_client }}</p>
            </div>
            }
          </div>
        </section>
        }

        <!-- Address Information (detailed with labels) -->
        @if (hasAddress()) {
        <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6" role="region" [attr.aria-label]="'address' | i18n">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4" id="address-title">
            {{ "address" | i18n }}
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'address-title'">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="postal-code-label">
                {{ 'postalCode' | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'postal-code-label'">{{ request().zip_code || '—' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="street-label">
                {{ 'logradouro' | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'street-label'">{{ request().street || request().street_manual || '—' }}</p>
              @if (request().street_manual && !request().street) {
                <span class="text-xs text-gray-500 dark:text-gray-400 italic">{{ 'manualEntry' | i18n }}</span>
              }
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="number-label">
                {{ 'number' | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'number-label'">{{ request().street_number || '—' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="complement-label">
                {{ 'complement' | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'complement-label'">{{ request().complement || '—' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="locality-label">
                {{ 'locality' | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'locality-label'">{{ addressParts().locality || '—' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="city-label">
                {{ 'concelho' | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'city-label'">{{ request().city || '—' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="district-label">
                {{ 'district' | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'district-label'">{{ request().state || '—' }}</p>
            </div>
          </div>
        </section>
        }

        <!-- Geolocation / Geolocalização -->
        @if (serviceLatitude() && serviceLongitude()) {
        <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6" role="region" [attr.aria-label]="'geolocation' | i18n">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100" id="geolocation-title">
              <i class="fas fa-map-marker-alt mr-2 text-brand-primary-500" aria-hidden="true"></i>
              {{ "geolocation" | i18n }}
            </h3>
            @if (currentUser().role === 'professional') {
              <button
                (click)="showRouteMap.set(!showRouteMap())"
                class="px-4 py-2 bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 transition-colors text-sm font-medium flex items-center gap-2"
                [attr.aria-label]="(showRouteMap() ? 'geolocation' : 'viewRoute') | i18n"
                [attr.aria-pressed]="showRouteMap()">
                <i class="fas fa-{{showRouteMap() ? 'map-marked-alt' : 'route'}}" aria-hidden="true"></i>
                {{ (showRouteMap() ? 'geolocation' : 'viewRoute') | i18n }}
              </button>
            }
          </div>
          <div class="space-y-4" [attr.aria-labelledby]="'geolocation-title'">
            @if (!showRouteMap()) {
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1" id="latitude-label">
                    Latitude
                  </label>
                  <p class="text-gray-900 dark:text-gray-100 font-mono" [attr.aria-labelledby]="'latitude-label'">{{ serviceLatitude() }}</p>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1" id="longitude-label">
                    Longitude
                  </label>
                  <p class="text-gray-900 dark:text-gray-100 font-mono" [attr.aria-labelledby]="'longitude-label'">{{ serviceLongitude() }}</p>
                </div>
              </div>
              <app-leaflet-map-viewer
                [latitude]="serviceLatitude()!"
                [longitude]="serviceLongitude()!"
                role="img"
                [attr.aria-label]="'mapViewerRegion' | i18n">
              </app-leaflet-map-viewer>
            } @else {
              <app-leaflet-route-map
                [destinationLatitude]="serviceLatitude()!"
                [destinationLongitude]="serviceLongitude()!"
                [mapHeight]="'500px'"
                [showInstructions]="true"
                role="img"
                [attr.aria-label]="'routeMapRegion' | i18n">
              </app-leaflet-route-map>
            }
          </div>
        </section>
        }

        <!-- Photos Gallery -->
        @if (hasPhotos()) {
        <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6" role="region" [attr.aria-label]="'photos' | i18n">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4" id="photos-title">
            {{ "photos" | i18n }}
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              ({{ request().photos!.length }})
            </span>
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4" role="grid" [attr.aria-labelledby]="'photos-title'">
            @for (photo of request().photos; track photo; let idx = $index) {
            <button 
              class="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-brand-primary-500 dark:hover:border-brand-primary-400 hover:shadow-lg transition-all cursor-pointer group"
              (click)="openPhotoModal(photo)"
              [attr.aria-label]="'photoOf' | i18n : { number: idx + 1 }"
              type="button"
            >
              <img 
                [src]="photo" 
                [alt]="'photoOf' | i18n : { number: idx + 1 }"
                class="w-full h-full object-cover"
                loading="lazy"
              >
              <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center" aria-hidden="true">
                <i class="fas fa-search-plus text-white opacity-0 group-hover:opacity-100 text-2xl transition-opacity"></i>
              </div>
            </button>
            }
          </div>
        </section>
        }

        <!-- Attachments -->
        @if (hasAttachments()) {
        <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6" role="region" [attr.aria-label]="'attachments' | i18n">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4" id="attachments-title">
            {{ "attachments" | i18n }}
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              ({{ request().attachments!.length }})
            </span>
          </h3>
          <div class="space-y-2" [attr.aria-labelledby]="'attachments-title'">
            @for (attachment of request().attachments; track attachment; let idx = $index) {
            <a 
              [href]="attachment"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-brand-primary-500 transition-colors"
              [attr.aria-label]="'attachmentLink' | i18n : { number: idx + 1 }"
            >
              <i class="fas fa-file-alt text-gray-400 text-xl mr-3" aria-hidden="true"></i>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">
                  {{ "attachment" | i18n }} {{ idx + 1 }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ "clickToView" | i18n }}</p>
              </div>
              <i class="fas fa-external-link-alt text-gray-400" aria-hidden="true"></i>
            </a>
            }
          </div>
        </section>
        }

        <!-- Time Control (for professionals) -->
        @if ( currentUser().role === "professional" && request().professional_id
        === currentUser().id && (request().status === "Em Progresso" ||
        request().status === "Aceito") ) {
        <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6" role="region" [attr.aria-label]="'timeControl' | i18n">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4" id="time-control-title">
            {{ "timeControl" | i18n }}
          </h3>
          <div [attr.aria-labelledby]="'time-control-title'">
            <app-time-control
              [serviceRequest]="request()"
              [user]="currentUser()"
            ></app-time-control>
          </div>
        </section>
        }

        <!-- Service Images - Upload de Imagens -->
        @if (request().professional_id) {
        <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700" role="region" [attr.aria-label]="'serviceImages' | i18n">
          <app-service-images
            [requestId]="request().id"
            [requestStatus]="request().status"
          ></app-service-images>
        </section>
        }

        <!-- Service Clarifications -->
        <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6" role="region" [attr.aria-label]="'serviceClarifications' | i18n">
          <app-service-clarifications
            [serviceRequest]="request()"
            [currentUser]="currentUser()"
          ></app-service-clarifications>
        </section>

        <!-- Action Buttons for mobile at bottom -->
        @if (availableActions().length > 0) {
        <section class="block sm:hidden">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4" role="region" [attr.aria-label]="'availableActions' | i18n">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3" id="mobile-actions-title">
              {{ "availableActions" | i18n }}
            </h3>
            <div class="space-y-2" [attr.aria-labelledby]="'mobile-actions-title'">
              @for (action of availableActions(); track action.type) {
              <button
                (click)="executeAction(action)"
                [disabled]="action.loading"
                [class]="
                  getActionButtonClass(action) + ' w-full justify-center'
                "
                [attr.aria-label]="action.label | i18n"
              >
                @if (action.loading) {
                <span
                  class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
                  aria-hidden="true"
                ></span>
                }
                {{ action.label | i18n }}
              </button>
              }
            </div>
          </div>
        </section>
        }
      </div>
      } @else {
      <div class="flex items-center justify-center h-64" role="status" aria-live="polite">
        <p class="text-gray-500 dark:text-gray-400">{{ "loadingServiceRequest" | i18n }}</p>
      </div>
      }
    </main>
    }

    <!-- Photo Modal -->
    @if (showPhotoModal()) {
    <div 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
      (click)="closePhotoModal()"
      role="dialog"
      [attr.aria-label]="'photoModal' | i18n"
      aria-modal="true"
    >
      <button
        (click)="closePhotoModal()"
        class="absolute top-4 right-4 text-white hover:text-gray-300 text-3xl z-10"
        [attr.aria-label]="'close' | i18n"
        type="button"
      >
        <i class="fas fa-times" aria-hidden="true"></i>
      </button>
      
      <div class="max-w-6xl max-h-full" (click)="$event.stopPropagation()">
        <img 
          [src]="selectedPhoto()"
          [alt]="'photo' | i18n"
          class="max-w-full max-h-[90vh] object-contain rounded-lg"
        >
      </div>
    </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestDetailsComponent {
  @Output() businessRuleError = new EventEmitter<string>();

  // Inputs usando signal inputs nativos do Angular
  requestInput = input<ServiceRequest>();
  currentUserInput = input<User>();

  // Injeção de serviços
  private readonly dataService = inject(DataService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflowService = inject(WorkflowServiceSimplified);
  private readonly addressService = inject(PortugalAddressDatabaseService);

  // Signal para request carregado via rota
  private readonly loadedRequest = signal<ServiceRequest | undefined>(undefined);
  private readonly loadedUser = signal<User | undefined>(undefined);

  // Request e User efetivos usados no template
  request = computed(() => {
    const inputReq = this.requestInput();
    const loadedReq = this.loadedRequest();
    return inputReq || loadedReq;
  });
  currentUser = computed(() => this.currentUserInput() || this.loadedUser() || this.authService.appUser());

  // Effect para reagir a mudanças no requestInput e carregar via rota se necessário
  private readonly requestEffect = effect(() => {
    const inputReq = this.requestInput();
    
    if (inputReq) {
      return;
    }
    
    // Se não há input, tentar carregar via rota
    const routeId = this.route.snapshot.params['id'];
    
    if (routeId) {
      const requests = this.dataService.serviceRequests();
      const foundRequest = requests.find(r => r.id === Number.parseInt(routeId));
      if (foundRequest) {
        this.loadedRequest.set(foundRequest);
      } else {
        this.router.navigate(['/admin/requests']);
      }
    }
  });
  
  // Effect para garantir que o user está disponível
  private readonly userEffect = effect(() => {
    const inputUser = this.currentUserInput();
    if (!inputUser && !this.loadedUser()) {
      const authUser = this.authService.appUser();
      if (authUser) {
        this.loadedUser.set(authUser);
      }
    }
  });

  // Signals para UI state
  showMobileActions = signal(false);
  showPhotoModal = signal(false);
  selectedPhoto = signal<string | null>(null);
  showRouteMap = signal(false);

  // Estado de carregamento com granularidade
  loadingState = signal<LoadingState>({
    main: false,
    coordinates: false,
    quotes: false,
  });

  // Verifica se há dados de endereço (aninhado ou campos planos)
  hasAddress = computed(() => {
    const r = this.request();
    const nested = (r as any).address;
    return !!(
      nested?.street ||
      nested?.postal_code ||
      nested?.locality ||
      nested?.district ||
      r.street ||
      r.city ||
      r.state ||
      r.zip_code
    );
  });

  // Linhas de endereço formatadas PT
  private readonly addressParts = computed(() => extractPtAddressParts(this.request()));
  addressLine1 = computed(() => this.addressParts().streetNumber);
  addressLine2 = computed(() => {
    const p = this.addressParts();
    return [p.postalCode, p.locality].filter(Boolean).join(" ");
  });
  addressLine3 = computed(() => this.addressParts().district);

  // Signal para armazenar coordenadas do código postal
  private readonly postalCodeCoordinates = signal<{ latitude: number; longitude: number } | null>(null);

  // Effect para buscar coordenadas quando o código postal do request mudar
  private readonly coordinatesEffect = effect(async () => {
    const postalCode = this.addressParts().postalCode;
    
    if (!postalCode) {
      this.postalCodeCoordinates.set(null);
      return;
    }

    try {
      const result = await this.addressService.validateCodigoPostal(postalCode);
      if (result.valid && result.endereco?.latitude && result.endereco?.longitude) {
        this.postalCodeCoordinates.set({
          latitude: result.endereco.latitude,
          longitude: result.endereco.longitude
        });
      } else {
        this.postalCodeCoordinates.set(null);
      }
    } catch (error) {
      console.error('Erro ao buscar coordenadas do código postal:', error);
      this.postalCodeCoordinates.set(null);
    }
  });

  // Coordenadas finais (do request ou do código postal)
  serviceLatitude = computed(() => {
    const req = this.request();
    return req.latitude || this.postalCodeCoordinates()?.latitude || null;
  });
  
  serviceLongitude = computed(() => {
    const req = this.request();
    return req.longitude || this.postalCodeCoordinates()?.longitude || null;
  });

  // Organiza e enriquece respostas de profissionais
  professionalQuotes = computed(() => {
    const req = this.request();
    const responses = req.professional_responses || [];
    
    if (responses.length === 0) return [];

    // Encontra o menor orçamento
    const amounts = responses
      .map(r => r.quote_amount)
      .filter((amt): amt is number => amt !== null && amt !== undefined);
    const lowestAmount = amounts.length > 0 ? Math.min(...amounts) : null;

    return responses.map(r => ({
      ...r,
      isSelected: r.professional_id === req.professional_id,
      isLowest: lowestAmount !== null && r.quote_amount === lowestAmount && r.quote_amount !== null,
      hasQuote: r.quote_amount !== null && r.quote_amount > 0,
    }));
  });

  // Verifica se há fotos anexadas
  hasPhotos = computed(() => {
    const photos = this.request().photos;
    return photos && photos.length > 0;
  });

  // Verifica se há anexos
  hasAttachments = computed(() => {
    const attachments = this.request().attachments;
    return attachments && attachments.length > 0;
  });

  // Verifica se deve mostrar o valor do prestador (ocultar para funcionários da Natan)
  shouldShowProviderValue = computed(() => {
    const user = this.currentUser();
    // Oculta para profissionais que são funcionários da Natan
    if (user.role === 'professional' && user.is_natan_employee === true) {
      return false;
    }
    return true;
  });

  // Outputs para eventos
  @Output() closeDetails = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<ServiceRequest>();
  @Output() approveQuote = new EventEmitter<ServiceRequest>();
  @Output() rejectQuote = new EventEmitter<ServiceRequest>();
  @Output() scheduleRequest = new EventEmitter<ServiceRequest>();
  @Output() payNow = new EventEmitter<ServiceRequest>();
  @Output() selectProfessional = new EventEmitter<{
    request: ServiceRequest;
    professionalId: string;
  }>();

  @Output() refreshRequest = new EventEmitter<void>();

  // Computed properties com type safety melhorado
  availableActions = computed<ServiceAction[]>(() => {
    const user = this.currentUser();
    const req = this.request();

    const allPossibleActions: (ServiceAction & { condition: boolean })[] = [
      // SISTEMA NOVO: Sem fase de orçamentos
      // Profissional não fornece mais orçamento, apenas aceita/recusa atribuição
      
      // Fase 1: Agendamento (após profissional aceitar)
      {
        type: "schedule" as ActionType,
        label: "scheduleService",
        class: "primary" as ActionClass,
        loading: false,
        condition: user.role === "professional" && req.professional_id === user.id && req.status === "Aceito" && !req.scheduled_date,
      },
      // Fase 2: Execução do Serviço
      {
        type: "start" as ActionType,
        label: "startService",
        class: "primary" as ActionClass,
        loading: false,
        condition: user.role === "professional" && req.professional_id === user.id && req.status === "Data Definida",
      },
      {
        type: "complete" as ActionType,
        label: "completeService",
        class: "primary" as ActionClass,
        loading: false,
        condition: user.role === "professional" && req.professional_id === user.id && req.status === "Em Progresso",
      },
      // Fase 3: Pagamento (Admin)
      {
        type: "pay" as ActionType,
        label: "payNow",
        class: "primary" as ActionClass,
        loading: false,
        condition: user.role === "admin" && req.status === "Aguardando Finalização" && !req.payment_date,
      },
      // Chat sempre disponível para partes envolvidas
      {
        type: "chat" as ActionType,
        label: "chat",
        class: "secondary" as ActionClass,
        loading: false,
        condition: (user.role === "admin" || (user.role === "professional" && req.professional_id === user.id)),
      },
    ];

    return allPossibleActions
      .filter((action) => action.condition)
      .map(({ condition, ...action }) => action);
  });

  toggleMobileActions() {
    this.showMobileActions.update((current) => !current);
  }

  getActionButtonClass(action: ServiceAction): string {
    const baseClasses =
      "inline-flex items-center font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

    switch (action.class) {
      case "primary":
        return `${baseClasses} bg-brand-primary-600 hover:bg-brand-primary-700 text-white`;
      case "secondary":
        return `${baseClasses} bg-gray-600 hover:bg-gray-700 text-white`;
      case "success":
        return `${baseClasses} bg-green-600 hover:bg-green-700 text-white`;
      case "danger":
        return `${baseClasses} bg-red-600 hover:bg-red-700 text-white`;
      default:
        return `${baseClasses} bg-gray-300 hover:bg-gray-400 text-gray-700`;
    }
  }



  getStatusLabel(status: ServiceStatus): string {
    return StatusUtilsService.getLabel(status, inject(I18nService));
  }

  getPriorityClass(priority: string): string {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";

    switch (priority) {
      case "high":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "medium":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "low":
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  getResponseStatusClass(status: string): string {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";

    switch (status) {
      case "pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "responded":
        return `${baseClasses} bg-brand-primary-100 text-brand-primary-800`;
      case "accepted":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "rejected":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  async executeAction(action: ServiceAction): Promise<void> {
    try {
      action.loading = true;

      switch (action.type) {
        case "schedule":
          this.scheduleRequest.emit(this.request());
          break;
        case "start":
          await this.handleStartService();
          break;
        case "complete":
          await this.handleCompleteService();
          break;
        case "pay":
          this.payNow.emit(this.request());
          break;
        case "chat":
          this.openChat.emit(this.request());
          break;
      }
    } catch (error) {
      console.error('Erro ao executar ação:', error);
      this.notificationService.addNotification(error instanceof Error ? error.message : 'Erro ao executar ação');
    } finally {
      action.loading = false;
    }
  }

  private async handleStartService(): Promise<void> {
    try {
      const currentUser = this.currentUser();
      if (currentUser?.role !== "professional") {
        throw new Error("Apenas profissionais podem iniciar serviços");
      }

      const success = await this.workflowService.startExecution(
        this.request().id,
        currentUser.id
      );

      if (success) {
        this.refreshRequest.emit();
      }
    } catch (error: any) {
      if (
        error instanceof Error &&
        error.message.includes("Tentativa de início antes da data agendada")
      ) {
        this.businessRuleError.emit(
          "Não é permitido iniciar o serviço antes da data agendada!"
        );
      } else {
        throw error;
      }
    }
  }

  private async handleCompleteService(): Promise<void> {
    try {
      const currentUser = this.currentUser();
      if (currentUser?.role !== "professional") {
        throw new Error("Apenas profissionais podem concluir serviços");
      }

      const success = await this.workflowService.completeExecution(
        this.request().id,
        currentUser.id
      );

      if (success) {
        this.refreshRequest.emit();
      }
    } catch (error: any) {
      if (
        error instanceof Error &&
        error.message.includes("Tentativa de conclusão antes do tempo mínimo")
      ) {
        this.businessRuleError.emit(
          "Não é permitido concluir o serviço antes do tempo mínimo!"
        );
      } else {
        throw error;
      }
    }
  }

  // Métodos para gerenciamento de fotos
  openPhotoModal(photoUrl: string): void {
    this.selectedPhoto.set(photoUrl);
    this.showPhotoModal.set(true);
  }

  closePhotoModal(): void {
    this.showPhotoModal.set(false);
    this.selectedPhoto.set(null);
  }

  // Método para selecionar profissional específico
  selectSpecificProfessional(professionalId: number): void {
    this.selectProfessional.emit({
      request: this.request(),
      professionalId: professionalId.toString(),
    });
  }

  // Corrige o botão Voltar para emitir o evento closeDetails corretamente
  logAndEmitCloseDetails() {
    this.closeDetails.emit();
    this.router.navigate(["/admin/requests"]);
  }
}



