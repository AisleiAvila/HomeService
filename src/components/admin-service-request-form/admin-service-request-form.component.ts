import {
  Component,
  ChangeDetectionStrategy,
  output,
  inject,
  signal,
  computed,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { I18nService } from "../../i18n.service";
import { NotificationService } from "../../services/notification.service";
import {
  ServiceSubcategory,
  Urgency,
} from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { PortugalAddressValidationService } from "../../services/portugal-address-validation.service";

export interface AdminServiceRequestPayload {
  title: string;
  description: string;
  category_id: number;
  subcategory_id: number;
  origin_id: number;
  requester_name: string;
  requester_phone: string;
  requester_nif?: string;
  street: string;
  postal_code: string;
  locality: string;
  district: string;
  location_details?: string;
  location_access_notes?: string;
  urgency: Urgency;
  service_deadline?: string;
}

@Component({
  selector: "app-admin-service-request-form",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./admin-service-request-form.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminServiceRequestFormComponent {
  closeModal = output<void>();

  logAndEmit() {
    console.log('Cancelar clicado (filho)');
    this.closeModal.emit();
  }

  private readonly i18n = inject(I18nService);
  private readonly dataService = inject(DataService);
  private readonly notificationService = inject(NotificationService);
  private readonly addressService = inject(PortugalAddressValidationService);

  categories = this.dataService.categories;
  subcategories = signal<ServiceSubcategory[]>([]);
  urgencyLevels: Urgency[] = ["low", "medium", "high", "critical"];

  postalCodeSuggestions = signal<string[]>([]);
  localitySuggestions = signal<string[]>([]);
  isPostalCodeValid = signal(true);

  newRequest = signal<AdminServiceRequestPayload>({
    title: "",
    description: "",
    category_id: 0,
    subcategory_id: 0,
    origin_id: 0,
    requester_name: "",
    requester_phone: "",
    requester_nif: "",
    street: "",
    postal_code: "",
    locality: "",
    district: "",
    location_details: "",
    location_access_notes: "",
    urgency: "medium",
    service_deadline: undefined,
  });
  origins = this.dataService.origins;

  updateNewRequest<K extends keyof AdminServiceRequestPayload>(key: K, value: AdminServiceRequestPayload[K]) {
    this.newRequest.update(req => ({ ...req, [key]: value }));
  }

  districts = computed(() =>
    this.addressService.districts().map(d => d.nome)
  );

  onCategoryChange(event: Event): void {
    const categoryId = +(event.target as HTMLSelectElement).value;
    this.newRequest.update(req => ({ ...req, category_id: categoryId }));
    const selectedCategory = this.categories().find(c => c.id === categoryId);
    console.log('=== onCategoryChange (admin) ===');
    console.log('Category ID:', categoryId);
    console.log('Selected category:', selectedCategory);
    console.log('Subcategories from category:', selectedCategory?.subcategories);
    this.subcategories.set(selectedCategory?.subcategories || []);
    console.log('Subcategories signal set to:', this.subcategories().length, 'items');
    this.newRequest.update(req => ({ ...req, subcategory_id: 0 }));
  }

  async onPostalCodeChange(postalCode: string): Promise<void> {
    this.newRequest.update(req => ({ ...req, postal_code: postalCode }));
    this.isPostalCodeValid.set(true);
    if (this.addressService.isPostalCodeComplete(postalCode)) {
      const addressInfo = await this.addressService.getAddressInfoByPostalCode(
        postalCode
      );
      if (addressInfo) {
        this.newRequest.update(req => ({
          ...req,
          locality: addressInfo.locality,
          district: addressInfo.district,
        }));
        this.isPostalCodeValid.set(true);
        this.postalCodeSuggestions.set([]);
        this.localitySuggestions.set([]);
      } else {
        this.isPostalCodeValid.set(false);
      }
    } else {
      this.postalCodeSuggestions.set(
        await this.addressService.getPostalCodeSuggestions(postalCode)
      );
    }
  }

  async onLocalityChange(locality: string): Promise<void> {
    this.newRequest.update(req => ({ ...req, locality }));
    this.localitySuggestions.set(
      await this.addressService.getLocalitySuggestions(locality)
    );
  }

  selectSuggestion(
    field: "postal_code" | "locality",
    value: string
  ): void {
    if (field === "postal_code") {
      this.onPostalCodeChange(value);
    } else {
      this.newRequest.update(req => ({ ...req, locality: value }));
      this.localitySuggestions.set([]);
    }
  }

  async submitRequest(): Promise<void> {
    try {
      this.notificationService.addNotification(this.i18n.translate("creating_service_request"));
      await this.dataService.addAdminServiceRequest(this.newRequest());
      this.notificationService.addNotification(this.i18n.translate("service_request_created_successfully"));
      this.closeModal.emit();
    } catch (error) {
      console.error("Error creating admin service request:", error);
      this.notificationService.addNotification(this.i18n.translate("error_creating_service_request"));
    }
  }
}
