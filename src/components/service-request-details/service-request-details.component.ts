import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from "@angular/core";
import { CommonModule, CurrencyPipe } from "@angular/common";
import { ServiceRequest, User } from "../../models/maintenance.models";
import { I18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-service-request-details",
  standalone: true,
  imports: [CommonModule, I18nPipe, CurrencyPipe],
  template: `
    <div class="p-6 bg-white rounded-lg relative max-h-full overflow-y-auto">
      <button
        (click)="close.emit()"
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
      >
        <i class="fas fa-times text-xl"></i>
      </button>

      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        {{ "serviceRequestDetails" | i18n }}
      </h2>

      @if (request()) {
      <div class="space-y-6">
        <!-- Basic Information -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "basicInformation" | i18n }}
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "title" | i18n
              }}</label>
              <p class="text-sm text-gray-900">{{ request().title }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "category" | i18n
              }}</label>
              <p class="text-sm text-gray-900">{{ request().category }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "status" | i18n
              }}</label>
              <span [class]="statusClass(request().status)">{{
                request().status
              }}</span>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "requestDate" | i18n
              }}</label>
              <p class="text-sm text-gray-900">
                {{ request().requested_date | date }}
              </p>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "description" | i18n }}
          </h3>
          <p class="text-sm text-gray-900 whitespace-pre-wrap">
            {{ request().description }}
          </p>
        </div>

        <!-- Address -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "serviceAddress" | i18n }}
          </h3>
          <p class="text-sm text-gray-900">{{ formatAddress(request()) }}</p>
        </div>

        <!-- Cost and Payment Information -->
        @if (request().cost || request().payment_status) {
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "costAndPayment" | i18n }}
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @if (request().cost) {
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "cost" | i18n
              }}</label>
              <p class="text-lg font-semibold text-green-600">
                {{ request().cost | currency }}
              </p>
            </div>
            } @if (request().payment_status) {
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "paymentStatus" | i18n
              }}</label>
              <span [class]="paymentStatusClass(request().payment_status)">{{
                request().payment_status
              }}</span>
            </div>
            }
          </div>
        </div>
        }

        <!-- Professional Information -->
        @if (request().professional_id) {
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "assignedProfessional" | i18n }}
          </h3>
          <p class="text-sm text-gray-900">
            {{ "professionalId" | i18n }}: {{ request().professional_id }}
          </p>
        </div>
        }

        <!-- Scheduled Date -->
        @if (request().scheduled_date) {
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "scheduledDate" | i18n }}
          </h3>
          <p class="text-sm text-gray-900">
            {{ request().scheduled_date | date : "medium" }}
          </p>
        </div>
        }

        <!-- Request ID -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "requestId" | i18n }}
          </h3>
          <p class="text-sm text-gray-600">{{ request().id }}</p>
        </div>
      </div>
      }

      <!-- Action Buttons -->
      <div class="pt-6 flex justify-end space-x-3">
        @if (request() && showActionButtons()) { @if (request().status ===
        'Quoted' && currentUser().role === 'client') {
        <button
          (click)="approveQuote.emit(request())"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          {{ "approve" | i18n }}
        </button>
        <button
          (click)="rejectQuote.emit(request())"
          class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          {{ "reject" | i18n }}
        </button>
        } @if (request().status === 'Approved' && currentUser().role ===
        'client') {
        <button
          (click)="scheduleRequest.emit(request())"
          class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
        >
          {{ "schedule" | i18n }}
        </button>
        } @if (request().status === 'Completed' && request().payment_status ===
        'Unpaid' && currentUser().role === 'client') {
        <button
          (click)="payNow.emit(request())"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          {{ "payNow" | i18n }}
        </button>
        }
        <button
          (click)="openChat.emit(request())"
          class="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
        >
          {{ "chat" | i18n }}
        </button>
        }
        <button
          (click)="close.emit()"
          class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
        >
          {{ "close" | i18n }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestDetailsComponent {
  request = input.required<ServiceRequest>();
  currentUser = input.required<User>();

  close = output<void>();
  openChat = output<ServiceRequest>();
  approveQuote = output<ServiceRequest>();
  rejectQuote = output<ServiceRequest>();
  scheduleRequest = output<ServiceRequest>();
  payNow = output<ServiceRequest>();

  showActionButtons = computed(() => {
    const user = this.currentUser();
    const req = this.request();

    // Show action buttons for clients or relevant statuses
    return (
      user.role === "client" ||
      req.status === "In Progress" ||
      req.status === "Completed"
    );
  });

  formatAddress(request: ServiceRequest): string {
    return `${request.street}, ${request.city}, ${request.state} ${request.zip_code}`;
  }

  statusClass(status: string): string {
    const baseClass =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    const colorClasses: { [key: string]: string } = {
      Pending: "bg-yellow-100 text-yellow-800",
      Quoted: "bg-cyan-100 text-cyan-800",
      Approved: "bg-indigo-100 text-indigo-800",
      Scheduled: "bg-teal-100 text-teal-800",
      Assigned: "bg-blue-100 text-blue-800",
      "In Progress": "bg-purple-100 text-purple-800",
      Completed: "bg-green-100 text-green-800",
      Cancelled: "bg-red-100 text-red-800",
    };
    return `${baseClass} ${
      colorClasses[status] || "bg-gray-100 text-gray-800"
    }`;
  }

  paymentStatusClass(status: string): string {
    const baseClass =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    return status === "Paid"
      ? `${baseClass} bg-green-100 text-green-800`
      : `${baseClass} bg-orange-100 text-orange-800`;
  }
}
