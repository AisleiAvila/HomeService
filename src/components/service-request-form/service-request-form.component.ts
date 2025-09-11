import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  inject,
  computed,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  User,
  Address,
  ServiceCategory,
  ServiceRequestPayload,
} from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { AddressAutocompleteService } from "../../services/address-autocomplete.service";
import { PortugalAddressValidationService } from "../../services/portugal-address-validation.service";
import { I18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-service-request-form",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  template: `
    <div class="p-6 bg-white rounded-lg relative max-h-full overflow-y-auto">
      <button
        (click)="close.emit()"
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
      >
        <i class="fas fa-times text-xl"></i>
      </button>
      <h2 class="text-2xl font-bold text-gray-800 mb-6">New Service Request</h2>
      <form (ngSubmit)="submitForm()" class="space-y-4">
        <div>
          <label for="title" class="block text-sm font-medium text-gray-700"
            >Title</label
          >
          <input
            id="title"
            type="text"
            [(ngModel)]="title"
            name="title"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label for="category" class="block text-sm font-medium text-gray-700"
            >Category</label
          >
          <select
            id="category"
            [(ngModel)]="category"
            name="category"
            required
            class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="" disabled>Select a category...</option>
            @for(cat of categories(); track cat) {
            <option [value]="cat">{{ cat }}</option>
            }
          </select>
        </div>

        <div>
          <label
            for="description"
            class="block text-sm font-medium text-gray-700"
            >Description</label
          >
          <textarea
            id="description"
            rows="4"
            [(ngModel)]="description"
            name="description"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          ></textarea>
        </div>

        <div class="relative">
          <label for="street" class="block text-sm font-medium text-gray-700">{{
            "streetAddress" | i18n
          }}</label>
          <input
            id="street"
            type="text"
            [ngModel]="addressQuery()"
            (ngModelChange)="updateStreet($event)"
            name="street"
            required
            autocomplete="off"
            [placeholder]="'streetAddressPlaceholder' | i18n"
            (focus)="showSuggestions.set(true)"
            (blur)="onAddressBlur()"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          @if (showSuggestions() && addressSuggestions().length > 0) {
          <ul
            class="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-60 overflow-auto"
          >
            @for(suggestion of addressSuggestions(); track suggestion.street) {
            <li
              (click)="selectAddress(suggestion)"
              class="px-4 py-2 cursor-pointer hover:bg-gray-100"
            >
              <div class="font-medium">{{ suggestion.street }}</div>
              <div class="text-sm text-gray-500">
                {{ suggestion.city }}, {{ suggestion.state }}
                {{ suggestion.zip_code }}
              </div>
            </li>
            }
          </ul>
          }
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="zip" class="block text-sm font-medium text-gray-700">{{
              "postalCode" | i18n
            }}</label>
            <input
              id="zip"
              type="text"
              [ngModel]="address().zip_code"
              (ngModelChange)="updatePostalCode($event)"
              name="zip_code"
              required
              maxlength="8"
              [placeholder]="'postalCodePlaceholder' | i18n"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              [class.border-red-500]="
                address().zip_code && !isValidPostalCode()
              "
            />
            @if (address().zip_code && !isValidPostalCode()) {
            <p class="text-red-500 text-xs mt-1">
              {{ "postalCodeInvalidFormat" | i18n }}
            </p>
            }
          </div>
          <div>
            <label for="city" class="block text-sm font-medium text-gray-700">{{
              "locality" | i18n
            }}</label>
            <input
              id="city"
              type="text"
              [ngModel]="address().city"
              (ngModelChange)="updateAddressField('city', $event)"
              name="city"
              required
              [placeholder]="'localityPlaceholder' | i18n"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              for="state"
              class="block text-sm font-medium text-gray-700"
              >{{ "district" | i18n }}</label
            >
            <select
              id="state"
              [ngModel]="address().state"
              (ngModelChange)="updateAddressField('state', $event)"
              name="state"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">{{ "selectDistrict" | i18n }}</option>
              @for(district of portugueseDistricts(); track district) {
              <option [value]="district">{{ district }}</option>
              }
            </select>
          </div>
          <div>
            <label
              for="concelho"
              class="block text-sm font-medium text-gray-700"
              >{{ "concelho" | i18n }}</label
            >
            <select
              id="concelho"
              [ngModel]="address().concelho || ''"
              (ngModelChange)="updateAddressField('concelho', $event)"
              name="concelho"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              [disabled]="
                loadingConcelhos() || portugalConcelhos().length === 0
              "
            >
              <option value="">{{ "selectConcelho" | i18n }}</option>
              @if (loadingConcelhos()) {
              <option disabled>{{ "loadingConcelhos" | i18n }}...</option>
              } @for(concelho of portugalConcelhos(); track concelho) {
              <option [value]="concelho">{{ concelho }}</option>
              }
            </select>
          </div>
        </div>

        <div class="pt-4 flex justify-end space-x-3">
          <button
            type="button"
            (click)="close.emit()"
            class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {{ "cancel" | i18n }}
          </button>
          <button
            type="submit"
            [disabled]="!canSubmit()"
            class="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            @if (isSubmitting()) {
            <i class="fas fa-spinner fa-spin mr-2"></i>
            Submitting... } @else { Submit Request }
          </button>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestFormComponent {
  user = input.required<User>();
  close = output<void>();
  formSubmitted = output<ServiceRequestPayload>();

  private dataService = inject(DataService);
  private addressService = inject(AddressAutocompleteService);
  private portugalValidationService = inject(PortugalAddressValidationService);

  // Form state signals
  title = signal("");
  description = signal("");
  category = signal<ServiceCategory>("");
  address = signal<Address>({ street: "", city: "", state: "", zip_code: "" });
  isSubmitting = signal(false);

  // Autocomplete state
  addressQuery = signal("");
  addressSuggestions = signal<Address[]>([]);
  showSuggestions = signal(false);

  categories = this.dataService.categories;

  // Portugal-specific data
  portugueseDistricts = signal<string[]>([]);
  portugalConcelhos = signal<string[]>([]);
  loadingConcelhos = signal(false);

  canSubmit = computed(() => {
    return (
      !this.isSubmitting() &&
      this.title().trim() &&
      this.description().trim() &&
      this.category() &&
      this.address().street.trim() &&
      this.address().city.trim() &&
      this.address().state.trim() &&
      this.address().zip_code.trim()
    );
  });

  constructor() {
    console.log("🚀 [FORM] Service Request Form Component inicializado");

    // Load Portuguese districts asynchronously
    this.loadPortugueseDistricts();

    effect(() => {
      const userAddress = this.user().address;
      if (userAddress) {
        this.address.set({ ...userAddress });
        this.addressQuery.set(userAddress.street);
      }
    });

    effect(() => {
      const query = this.addressQuery();
      if (query.length > 2) {
        this.addressService.getSuggestions(query).then((suggestions) => {
          this.addressSuggestions.set(suggestions);
          this.showSuggestions.set(suggestions.length > 0);
        });
      } else {
        this.addressSuggestions.set([]);
        this.showSuggestions.set(false);
      }
    });

    // Reset loading state when component is reused
    effect(() => {
      // Reset submitting state when user changes (component reinitialized)
      this.isSubmitting.set(false);
    });
  }

  updateStreet(street: string) {
    this.addressQuery.set(street);
    this.address.update((a) => ({ ...a, street }));
  }

  updatePostalCode(postalCode: string) {
    console.log("🔍 [POSTAL CODE] Usuário digitou:", postalCode);

    const formatted =
      this.portugalValidationService.formatPostalCode(postalCode);

    console.log("✏️ [POSTAL CODE] Código formatado:", formatted);

    this.address.update((a) => ({ ...a, zip_code: formatted }));

    // Auto-complete city and district based on postal code using new API
    if (this.portugalValidationService.validatePostalCode(formatted)) {
      console.log(
        "✅ [POSTAL CODE] Formato válido, iniciando validação completa..."
      );

      // Try API validation first
      this.portugalValidationService
        .validatePostalCodeWithApi(formatted)
        .subscribe({
          next: (result) => {
            console.log("📊 [POSTAL CODE] Resultado da validação:", result);

            if (result.isValid && result.locality && result.district) {
              console.log("🎯 [POSTAL CODE] Dados encontrados:", {
                localidade: result.locality,
                distrito: result.district,
                concelho: result.municipality || result.locality,
              });

              this.address.update((a) => ({
                ...a,
                city: result.locality,
                state: result.district,
                concelho: result.municipality || result.locality,
              }));

              // Load concelhos for the auto-filled district
              if (result.district) {
                console.log(
                  "🏛️ [POSTAL CODE] Carregando concelhos para distrito:",
                  result.district
                );
                this.loadConcelhosByDistrito(result.district);
              }
            } else {
              console.warn(
                "⚠️ [POSTAL CODE] Validação falhou, usando fallback offline"
              );
              // Fallback to existing service if API fails
              this.fallbackToOfflineValidation(formatted);
            }
          },
          error: (error) => {
            console.error(
              "❌ [POSTAL CODE] Erro na validação, usando fallback offline:",
              error
            );
            // Fallback to existing service if API fails
            this.fallbackToOfflineValidation(formatted);
          },
        });
    } else {
      console.warn("⚠️ [POSTAL CODE] Formato inválido:", formatted);
    }
  }

  private fallbackToOfflineValidation(postalCode: string) {
    console.log("💾 [FALLBACK] Tentando validação offline para:", postalCode);

    this.addressService
      .getAddressByPostalCode(postalCode)
      .then((addressInfo) => {
        if (addressInfo) {
          console.log("✅ [FALLBACK] Dados encontrados offline:", addressInfo);

          this.address.update((a) => ({
            ...a,
            city: addressInfo.city,
            state: addressInfo.state,
            concelho: addressInfo.concelho,
          }));

          // Load concelhos for the fallback district
          if (addressInfo.state) {
            console.log(
              "🏛️ [FALLBACK] Carregando concelhos para distrito:",
              addressInfo.state
            );
            this.loadConcelhosByDistrito(addressInfo.state);
          }
        } else {
          console.warn(
            "❌ [FALLBACK] Nenhum dado encontrado offline para:",
            postalCode
          );
        }
      })
      .catch((error) => {
        console.error("❌ [FALLBACK] Erro na validação offline:", error);
      });
  }

  isValidPostalCode(): boolean {
    return this.portugalValidationService.validatePostalCode(
      this.address().zip_code
    );
  }

  selectAddress(selectedAddress: Address) {
    this.address.set(selectedAddress);
    this.addressQuery.set(selectedAddress.street);
    this.showSuggestions.set(false);
  }

  submitForm() {
    if (!this.canSubmit() || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    const payload = {
      title: this.title(),
      description: this.description(),
      category: this.category(),
      address: this.address(),
      requested_date: new Date().toISOString(),
    };

    this.formSubmitted.emit(payload);
  }

  // Method to reset form state (can be called by parent)
  resetForm() {
    this.isSubmitting.set(false);
    this.title.set("");
    this.description.set("");
    this.category.set("");
    this.address.set({ street: "", city: "", state: "", zip_code: "" });
    this.addressQuery.set("");
  }

  onAddressBlur() {
    // Use setTimeout to allow click event on suggestions to fire before hiding
    setTimeout(() => this.showSuggestions.set(false), 200);
  }

  updateAddressField(field: keyof Address, value: string) {
    console.log(`🏠 [ADDRESS] Campo '${field}' atualizado para:`, value);

    this.address.update((current) => ({ ...current, [field]: value }));

    // If district changed, load concelhos for that district
    if (field === "state" && value) {
      console.log("🏛️ [ADDRESS] Distrito alterado, carregando concelhos...");
      this.loadConcelhosByDistrito(value);

      // Clear concelho when district changes
      this.address.update((current) => ({ ...current, concelho: "" }));
      console.log("🧹 [ADDRESS] Concelho limpo devido à mudança de distrito");
    }
  }

  private async loadPortugueseDistricts() {
    console.log("🏛️ [DISTRICTS] Carregando distritos portugueses...");

    try {
      const districts =
        await this.portugalValidationService.getPortugueseDistricts();

      console.log(
        `✅ [DISTRICTS] ${districts.length} distritos carregados:`,
        districts
      );
      this.portugueseDistricts.set(districts);
    } catch (error) {
      console.warn(
        "⚠️ [DISTRICTS] Erro ao carregar distritos da base de dados, usando fallback:",
        error
      );

      // Fallback to offline districts if database fails
      const fallbackDistricts =
        this.portugalValidationService.getPortugueseDistrictsOffline();

      console.log(
        `💾 [DISTRICTS] Usando ${fallbackDistricts.length} distritos offline:`,
        fallbackDistricts
      );
      this.portugueseDistricts.set(fallbackDistricts);
    }
  }

  private async loadConcelhosByDistrito(distritoNome: string) {
    if (!distritoNome) {
      console.log("🏛️ [CONCELHOS] Distrito vazio, limpando lista de concelhos");
      this.portugalConcelhos.set([]);
      return;
    }

    console.log(
      "🏛️ [CONCELHOS] Carregando concelhos para distrito:",
      distritoNome
    );
    this.loadingConcelhos.set(true);

    try {
      const concelhos =
        await this.portugalValidationService.getConcelhosByDistrito(
          distritoNome
        );

      console.log(
        `✅ [CONCELHOS] ${concelhos.length} concelhos carregados para ${distritoNome}:`,
        concelhos
      );
      this.portugalConcelhos.set(concelhos);
    } catch (error) {
      console.error(
        `❌ [CONCELHOS] Erro ao carregar concelhos para ${distritoNome}:`,
        error
      );
      this.portugalConcelhos.set([]);
    } finally {
      this.loadingConcelhos.set(false);
      console.log("🏛️ [CONCELHOS] Carregamento finalizado");
    }
  }
}
