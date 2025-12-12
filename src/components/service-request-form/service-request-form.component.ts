import {
  Component,
  computed,
  EventEmitter,
  inject,
  OnInit,
  Output,
  signal
} from "@angular/core";

import { I18nService } from "@/src/i18n.service";
import { I18nPipe } from "@/src/pipes/i18n.pipe";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import type { ServiceSubcategory } from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { LeafletMapViewerComponent } from "../leaflet-map-viewer.component";

@Component({
  selector: "app-service-request-form",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe, LeafletMapViewerComponent],
  templateUrl: "./service-request-form.component.html",
})
export class ServiceRequestFormComponent implements OnInit {
  latitude = signal<number | null>(null);
  longitude = signal<number | null>(null);
      // Signals para valores do serviço
      valor = signal<number | null>(null);
      valor_prestador = signal<number | null>(null);
    // Sinal para origens de solicitação
    origins = inject(DataService).origins;
    origin_id = signal<number>(0);
  // Propriedade para controlar se o campo foi tocado/interagido
  touched: {
    title: boolean;
    description: boolean;
    requestedDateTime: boolean;
    zip_code: boolean;
    number: boolean;
    client_name: boolean;
    client_phone: boolean;
    client_nif: boolean;
  } = {
    title: false,
    description: false,
    requestedDateTime: false,
    zip_code: false,
    number: false,
    client_name: false,
    client_phone: false,
    client_nif: false,
  };
  // Sinal para estado de submissão
  isSubmitting = signal<boolean>(false);
  // Corrige erro: método para formatar zip_code ao colar
  async onZipCodePaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData("text") || "";
    let digits = pasted.replaceAll(/\D/g, "");
    let formatted = digits;
    if (digits.length > 4) {
      formatted = digits.slice(0, 4) + "-" + digits.slice(4, 7);
    }
    if (formatted.length > 8) {
      formatted = formatted.slice(0, 8);
    }
    await this.updateField("zip_code", formatted);
  }
  @Output() closeForm = new EventEmitter<void>();

  onCancelClick() {
    console.log('Cancelar clicado (service-request-form)');
    this.closeForm.emit();
  }
  private readonly dataService = inject(DataService);
  private readonly i18n = inject(I18nService);

  // Usar signals diretamente do DataService
  // Filtrar apenas categorias que têm subcategorias
  categories = computed(() => {
    const allCats = this.dataService.categories();
    console.log('========================================');
    console.log('🔍 [ServiceRequestForm] INICIO DO FILTRO');
    console.log('🔍 Total de categorias:', allCats.length);
    
    const filtered = allCats.filter(cat => {
      // Verificar se subcategories existe E não é um array vazio
      const hasSubcats = Array.isArray(cat.subcategories) && cat.subcategories.length > 0;
      console.log(`   📋 ${cat.name}:`);
      console.log(`      - Subcategorias: ${JSON.stringify(cat.subcategories)}`);
      console.log(`      - Length: ${cat.subcategories?.length || 0}`);
      console.log(`      - ${hasSubcats ? '✅ EXIBIR' : '❌ OCULTAR'}`);
      return hasSubcats;
    });
    
    console.log('✅ Categorias que SERÃO EXIBIDAS:', filtered.map(c => c.name));
    console.log('========================================');
    return filtered;
  });
  subcategories = signal<ServiceSubcategory[]>([]);
  subcategory_id = signal<number | null>(null);

  title = signal<string>("");
  description = signal<string>("");
  requestedDateTime = signal<string>("");
  priority = signal<string>("");
  
  // Signals para informações do solicitante
  client_name = signal<string>("");
  client_phone = signal<string>("");
  client_nif = signal<string>("");
  
  ngOnInit(): void {
    this.dataService.fetchOrigins();
  }

  onCategoryChange(value: string) {
    console.log('=== onCategoryChange called ===');
    console.log('Value received:', value);
    
    const categoryId = value ? Number(value) : null;
    this.category_id.set(categoryId);
    
    // Buscar subcategorias da categoria selecionada
    if (categoryId) {
      const selectedCategory = this.categories().find(c => c.id === categoryId);
      console.log('Selected category:', selectedCategory);
      this.subcategories.set(selectedCategory?.subcategories || []);
      console.log('Subcategories set to:', this.subcategories().length);
    } else {
      this.subcategories.set([]);
    }
    
    // Reset subcategoria
    this.subcategory_id.set(null);
    this.validFields.update((fields) => ({
      ...fields,
      category_id: !!categoryId,
      subcategory_id: false,
    }));
  }

  category_id = signal<number | null>(null);
  street = signal<string>("");
  city = signal<string>("");
  state = signal<string>("");
  zip_code = signal<string>("");
  number = signal<string>("");
  complement = signal<string>("");
  locality = signal<string>("");
  district = signal<string>("");
  county = signal<string>("");

  // Sinais para feedback visual
  formError = signal<string | null>(null);
  formSuccess = signal<string | null>(null);

  // Sinal para controlar a validade dos campos
  validFields = signal<{
    title: boolean;
    description: boolean;
    category_id: boolean;
    subcategory_id: boolean;
    requestedDateTime: boolean;
    priority: boolean;
    street: boolean;
    city: boolean;
    state: boolean;
    zip_code: boolean;
    number: boolean;
    client_name: boolean;
    client_phone: boolean;
    client_nif: boolean;
    valor: boolean;
    valor_prestador: boolean;
  }>({
    title: false,
    description: false,
    category_id: false,
    subcategory_id: false,
    requestedDateTime: false,
    priority: false,
    street: false,
    city: false,
    state: false,
    zip_code: false,
    number: false,
    client_name: false,
    client_phone: false,
    client_nif: true, // NIF é opcional
    valor: false,
    valor_prestador: false,
  });

  // Método para verificar se o formulário está válido
  isFormValid(): boolean {
    const fields = this.validFields();
    return (
      fields.title &&
      fields.description &&
      fields.category_id &&
      fields.subcategory_id &&
      fields.requestedDateTime &&
      fields.priority &&
      fields.street &&
      fields.city &&
      fields.state &&
      fields.zip_code &&
      fields.client_name &&
      fields.client_phone &&
      fields.valor &&
      fields.valor_prestador &&
      fields.client_nif // NIF sempre válido (opcional)
    );
  }

  // Validar e atualizar campos simples
  async updateField(field: string, value: string | null | undefined) {
    if (value === null || value === undefined) {
      return;
    }
    this.formError.set(null);

    const fieldHandlers: Record<string, () => void | Promise<void>> = {
      title: () => this.updateTitle(value),
      description: () => this.updateDescription(value),
      category_id: () => this.updateCategoryId(value),
      subcategory_id: () => this.updateSubcategoryId(value),
      requestedDateTime: () => this.updateRequestedDateTime(value),
      priority: () => this.updatePriority(value),
      zip_code: async () => {
        await this.updateZipCode(value);
        // Automação: buscar endereço e preencher lat/lng
        if (value?.length === 8) {
          const addressService = await import('../../services/portugal-address-database.service');
          const serviceInstance = new addressService.PortugalAddressDatabaseService();
          try {
            const endereco = await serviceInstance.getEnderecoByCodigoPostal(value);
            if (endereco) {
              this.latitude.set(typeof endereco.latitude === 'number' ? endereco.latitude : null);
              this.longitude.set(typeof endereco.longitude === 'number' ? endereco.longitude : null);
              this.locality.set(endereco.localidade ?? '');
              this.district.set(endereco.distrito ?? '');
              this.county.set(endereco.concelho ?? '');
              this.street.set(endereco.designacao_postal ?? '');
            }
          } catch {
            // Apenas loga erro, não interrompe fluxo
            console.warn('Erro ao buscar coordenadas do endereço.');
          }
        }
      },
      number: () => this.updateNumber(value),
      complement: () => this.complement.set(value),
      client_name: () => this.updateClientName(value),
      client_phone: () => this.updateClientPhone(value),
      client_nif: () => this.updateClientNif(value),
      valor: () => this.updateValor(value),
      valor_prestador: () => this.updateValorPrestador(value),
      latitude: () => this.latitude.set(value ? Number(value) : null),
      longitude: () => this.longitude.set(value ? Number(value) : null),
    };

    const handler = fieldHandlers[field];
    if (handler) {
      await handler();
    }
  }

  private updateTitle(value: string) {
    this.title.set(value);
    this.validFields.update((fields) => ({
      ...fields,
      title: value.length >= 3,
    }));
  }

  private updateValor(value: string) {
    const num = Number(value);
    this.valor.set(Number.isNaN(num) ? null : num);
    this.validFields.update((fields) => ({
      ...fields,
      valor: !Number.isNaN(num) && num > 0,
    }));
  }

  private updateValorPrestador(value: string) {
    const num = Number(value);
    this.valor_prestador.set(Number.isNaN(num) ? null : num);
    this.validFields.update((fields) => ({
      ...fields,
      valor_prestador: !Number.isNaN(num) && num > 0,
    }));
  }

  private updateDescription(value: string) {
    this.description.set(value);
    this.validFields.update((fields) => ({
      ...fields,
      description: value.length >= 10,
    }));
  }

  private updateCategoryId(value: string) {
    console.log('=== updateField category_id (legacy) ===');
    const numValue = value ? Number(value) : null;
    this.category_id.set(numValue);
    this.subcategory_id.set(null);
    this.validFields.update((fields) => ({
      ...fields,
      category_id: !!value,
      subcategory_id: false,
    }));
  }

  private updateSubcategoryId(value: string) {
    this.subcategory_id.set(value ? Number(value) : null);
    this.validFields.update((fields) => ({
      ...fields,
      subcategory_id: !!value,
    }));
  }

  private updateRequestedDateTime(value: string) {
    this.requestedDateTime.set(value);
    const isValid = !!value && new Date(value) > new Date();
    this.validFields.update((fields) => ({
      ...fields,
      requestedDateTime: isValid,
    }));
  }

  private updatePriority(value: string) {
    this.priority.set(value);
    this.validFields.update((fields) => ({
      ...fields,
      priority: !!value && (value === "Normal" || value === "Urgent"),
    }));
  }

  private async updateZipCode(value: string) {
    const formatted = this.formatZipCode(value);
    this.zip_code.set(formatted);
    const isValidZip = this.isValidPostalCode(formatted);
    this.validFields.update((fields) => ({
      ...fields,
      zip_code: isValidZip,
    }));

    if (isValidZip) {
      await this.fetchPostalCodeInfo(formatted);
    } else {
      this.clearAddressFields();
    }
  }

  private formatZipCode(value: string): string {
    let formatted = value.replaceAll(/\D/g, "");
    if (formatted.length > 4) {
      formatted = formatted.slice(0, 4) + "-" + formatted.slice(4, 7);
    }
    if (formatted.length > 8) {
      formatted = formatted.slice(0, 8);
    }
    return formatted;
  }

  private async fetchPostalCodeInfo(formatted: string) {
    const result = await this.dataService.getPostalCodeInfo(formatted);
    if (result) {
      this.populateAddressFields(result);
    } else {
      this.clearAddressFields();
      this.formError.set("Código postal não encontrado.");
    }
  }

  private populateAddressFields(result: any) {
    this.locality.set(result.localidade || "");
    this.district.set(result.distrito || "");
    this.county.set(result.concelho || "");
    this.street.set(result.arteria_completa || "");
    this.validFields.update((fields) => ({
      ...fields,
      street: !!result.arteria_completa,
      city: !!result.concelho,
      state: !!result.distrito,
    }));
  }

  private clearAddressFields() {
    this.locality.set("");
    this.district.set("");
    this.county.set("");
    this.street.set("");
    this.validFields.update((fields) => ({
      ...fields,
      street: false,
      city: false,
      state: false,
    }));
  }

  private updateNumber(value: string) {
    this.number.set(value);
    this.validFields.update((fields) => ({
      ...fields,
      number: !!value && value.length > 0,
    }));
  }

  private updateClientName(value: string) {
    this.client_name.set(value);
    this.validFields.update((fields) => ({
      ...fields,
      client_name: value.length >= 3,
    }));
  }

  private updateClientPhone(value: string) {
    this.client_phone.set(value);
    const isValidPhone = /^\d{9}$/.test(value);
    this.validFields.update((fields) => ({
      ...fields,
      client_phone: isValidPhone,
    }));
  }

  private updateClientNif(value: string) {
    this.client_nif.set(value);
    const isValidNIF = !value || /^\d{9}$/.test(value);
    this.validFields.update((fields) => ({
      ...fields,
      client_nif: isValidNIF,
    }));
  }

  // Método para validação de código postal português
  isValidPostalCode(postalCode: string): boolean {
    // Aceita formato 'XXXX-XXX' ou apenas dígitos (7 caracteres)
    const regex = /^\d{4}-\d{3}$/;
    const digitsOnly = postalCode.replaceAll(/\D/g, "");
    // Aceita 'XXXX-XXX' ou 'XXXXXXX'
    if (regex.test(postalCode)) {
      return true;
    }
    if (digitsOnly.length === 7) {
      return true;
    }
    return false;
  }

  // Método para exibir mensagem de sucesso com temporizador para remoção
  showSuccessMessage(message: string, duration: number = 5000): void {
    this.formSuccess.set(message);

    // Remover a mensagem de sucesso após o período especificado
    setTimeout(() => {
      this.formSuccess.set(null);
    }, duration);
  }
  // Chamada ao serviço para criar solicitação de serviço
  async onSubmit() {
    this.isSubmitting.set(true);
    console.log("onSubmit chamado", {
      title: this.title(),
      description: this.description(),
      // category removido, agora usamos category_id
      // requestedDateTime removido, agora usamos requested_datetime
      street: this.street(),
      number: this.number(),
      complement: this.complement(),
      zip_code: this.zip_code(),
      locality: this.locality(),
      district: this.district(),
      county: this.county(),
    });
    if (!this.isFormValid()) {
      this.formError.set(this.i18n.translate("formErrorGeneric"));
      this.isSubmitting.set(false);
      return;
    }
    try {
      // Normaliza zip_code para formato XXXX-XXX
      let zip = this.zip_code();
      const digitsOnly = zip.replaceAll(/\D/g, "");
      if (digitsOnly.length === 7) {
        zip = digitsOnly.slice(0, 4) + "-" + digitsOnly.slice(4);
      }
      const address = {
        street: this.street(),
        street_number: this.number(),
        complement: this.complement(),
        city: this.locality(),
        state: this.district(),
        zip_code: zip,
        concelho: this.county(),
        freguesia: undefined,
      };
      const payload = {
        title: this.title(),
        description: this.description(),
        category_id: this.category_id(),
        subcategory_id: this.subcategory_id(),
        origin_id: this.origin_id(),
        address,
        requested_datetime: this.requestedDateTime(),
        valor: this.valor(),
        valor_prestador: this.valor_prestador(),
        latitude: this.latitude(),
        longitude: this.longitude(),
      };
      await this.dataService.addServiceRequest(payload);
      this.showSuccessMessage(this.i18n.translate("formSuccessGeneric"));
      // Opcional: resetar campos ou fechar modal
      this.closeForm.emit();
      this.isSubmitting.set(false);
    } catch (error) {
      console.error("Erro ao enviar solicitação de serviço:", error);
      this.formError.set(
        this.i18n.translate("formErrorGeneric") +
          (error?.message ? ` (${error.message})` : "")
      );
      this.isSubmitting.set(false);
    }
  }
}
