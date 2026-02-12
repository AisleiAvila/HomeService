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
import type { ServiceSubcategory, StockItem } from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { PortugalAddressDatabaseService } from "../../services/portugal-address-database.service";
import { AuthService } from "../../services/auth.service";
import { WarehouseService } from "../../services/warehouse.service";
import { InventoryService } from "../../services/inventory.service";
import { ServiceRequestMaterialsService } from "../../services/service-request-materials.service";

@Component({
  selector: "app-service-request-form",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
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
    // Signal para Ordem de Serviço (OS)
    os = signal<string>("");
  // Propriedade para controlar se o campo foi tocado/interagido
  touched: {
    title: boolean;
    description: boolean;
    requestedDateTime: boolean;
    zip_code: boolean;
    number: boolean;
    street: boolean;
    client_name: boolean;
    client_phone: boolean;
    client_nif: boolean;
    email_client: boolean;
  } = {
    title: false,
    description: false,
    requestedDateTime: false,
    zip_code: false,
    number: false,
    street: false,
    client_name: false,
    client_phone: false,
    client_nif: false,
    email_client: false,
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
  private readonly addressService = inject(PortugalAddressDatabaseService);
  private readonly authService = inject(AuthService);
  readonly warehouseService = inject(WarehouseService);
  private readonly inventoryService = inject(InventoryService);
  private readonly serviceRequestMaterialsService = inject(ServiceRequestMaterialsService);

  currentUser = this.authService.appUser;
  isSecretary = computed(() => this.currentUser()?.role === "secretario");

  selectedWarehouseId = signal<number | null>(null);
  selectedStockItemId = signal<number | null>(null);
  availableStockItems = signal<StockItem[]>([]);
  isLoadingStockItems = signal<boolean>(false);

  isWortenOrigin = computed(() => {
    const originId = this.origin_id();
    if (!originId) return false;
    const selectedOrigin = this.origins().find((origin) => origin.id === originId);
    const originName = (selectedOrigin?.name || "").toLowerCase();
    return originId === 2 || originName.includes("worten");
  });

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
  email_client = signal<string>("");
  
  ngOnInit(): void {
    this.dataService.fetchOrigins();
    this.warehouseService.fetchWarehouses();

    if (this.isSecretary()) {
      this.valor.set(0);
      this.valor_prestador.set(0);
      this.validFields.update((fields) => ({
        ...fields,
        valor: true,
        valor_prestador: true,
      }));
    }
  }

  async onOriginChange(value: string) {
    const originId = value ? Number(value) : 0;
    this.origin_id.set(originId);

    if (!this.isWortenOrigin()) {
      this.resetStockSelection();
    }
  }

  async onWarehouseChange(value: string) {
    const warehouseId = value ? Number(value) : null;
    this.selectedWarehouseId.set(warehouseId);
    this.selectedStockItemId.set(null);

    if (!warehouseId) {
      this.availableStockItems.set([]);
      return;
    }

    await this.loadAvailableStockItems(warehouseId);
  }

  onStockItemChange(value: string) {
    const itemId = value ? Number(value) : null;
    this.selectedStockItemId.set(itemId);
  }

  private async loadAvailableStockItems(warehouseId: number): Promise<void> {
    this.isLoadingStockItems.set(true);
    try {
      const items = await this.inventoryService.fetchAvailableStockItemsByWarehouse(warehouseId);
      this.availableStockItems.set(items);
    } finally {
      this.isLoadingStockItems.set(false);
    }
  }

  private resetStockSelection(): void {
    this.selectedWarehouseId.set(null);
    this.selectedStockItemId.set(null);
    this.availableStockItems.set([]);
    this.isLoadingStockItems.set(false);
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
  street_manual = signal<string>("");
  hasStreetFromPostalCode = signal<boolean>(false);
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
    street_manual: boolean;
    city: boolean;
    state: boolean;
    zip_code: boolean;
    number: boolean;
    client_name: boolean;
    client_phone: boolean;
    client_nif: boolean;
    email_client: boolean;
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
    street_manual: false,
    city: false,
    state: false,
    zip_code: false,
    number: false,
    client_name: false,
    client_phone: false,
    client_nif: true, // NIF é opcional
    email_client: true, // Email é opcional
    valor: false,
    valor_prestador: false,
  });

  // Método para verificar se o formulário está válido
  isFormValid(): boolean {
    const fields = this.validFields();
    // Validar street_manual apenas se não houver logradouro do código postal
    const streetValid = this.hasStreetFromPostalCode() || fields.street_manual;
    return (
      fields.title &&
      fields.description &&
      fields.category_id &&
      fields.subcategory_id &&
      fields.requestedDateTime &&
      fields.priority &&
      streetValid &&
      fields.city &&
      fields.state &&
      fields.zip_code &&
      fields.client_name &&
      fields.client_phone &&
      (this.isSecretary() || fields.valor) &&
      (this.isSecretary() || fields.valor_prestador) &&
      fields.client_nif && // NIF sempre válido (opcional)
      fields.email_client // Email sempre válido (opcional)
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
      zip_code: async () => this.updateZipCode(value),
      number: () => this.updateNumber(value),
      complement: () => this.complement.set(value),
      street_manual: () => this.updateStreetManual(value),
      client_name: () => this.updateClientName(value),
      client_phone: () => this.updateClientPhone(value),
      client_nif: () => this.updateClientNif(value),
      email_client: () => this.updateEmailClient(value),
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
      valor: !Number.isNaN(num) && num >= 0,
    }));
  }

  private updateValorPrestador(value: string) {
    const num = Number(value);
    this.valor_prestador.set(Number.isNaN(num) ? null : num);
    this.validFields.update((fields) => ({
      ...fields,
      valor_prestador: !Number.isNaN(num) && num >= 0,
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
      try {
        const endereco = await this.addressService.getEnderecoByCodigoPostal(formatted);
        console.log('[updateZipCode] Endereço recebido:', endereco);
        if (endereco) {
          this.populateAddressFieldsFromService(endereco);
        } else {
          this.clearAddressFields();
          this.formError.set("Código postal não encontrado.");
        }
      } catch (error) {
        console.error('[updateZipCode] Erro:', error);
        this.clearAddressFields();
        this.formError.set("Erro ao buscar código postal.");
      }
    } else if (!isValidZip) {
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

  private populateAddressFieldsFromService(endereco: any) {
    console.log('[populateAddressFieldsFromService] Endereço completo:', endereco);
    
    this.locality.set(endereco.localidade || "");
    this.district.set(endereco.distrito || "");
    this.county.set(endereco.concelho || "");
    
    // Apenas arteria é considerado logradouro válido
    // designacao_postal geralmente contém concelho/localidade quando não há arteria
    const streetFromPostal = endereco.arteria || "";
    this.street.set(streetFromPostal);
    this.hasStreetFromPostalCode.set(!!streetFromPostal);
    
    console.log('[populateAddressFieldsFromService] Logradouro:', {
      arteria: endereco.arteria,
      designacao_postal: endereco.designacao_postal,
      streetFromPostal,
      hasStreetFromPostalCode: !!streetFromPostal
    });
    
    // Definir coordenadas
    console.log('[populateAddressFieldsFromService] Verificando coordenadas:', {
      latitude: endereco.latitude,
      longitude: endereco.longitude
    });
    
    if (endereco.latitude !== undefined && endereco.latitude !== null) {
      const lat = typeof endereco.latitude === 'number' ? endereco.latitude : Number.parseFloat(endereco.latitude);
      this.latitude.set(lat);
      console.log('[populateAddressFieldsFromService] Latitude definida:', lat);
    }
    if (endereco.longitude !== undefined && endereco.longitude !== null) {
      const lng = typeof endereco.longitude === 'number' ? endereco.longitude : Number.parseFloat(endereco.longitude);
      this.longitude.set(lng);
      console.log('[populateAddressFieldsFromService] Longitude definida:', lng);
    }
    
    console.log('[populateAddressFieldsFromService] Coordenadas finais:', {
      latitude: this.latitude(),
      longitude: this.longitude()
    });
    
    // Se não houver logradouro, limpar o manual e permitir edição
    if (!streetFromPostal) {
      this.street_manual.set('');
    }
    
    this.validFields.update((fields) => ({
      ...fields,
      street: !!streetFromPostal,
      city: !!endereco.concelho,
      state: !!endereco.distrito,
    }));
  }

  private clearAddressFields() {
    this.locality.set("");
    this.district.set("");
    this.county.set("");
    this.street.set("");
    this.hasStreetFromPostalCode.set(false);
    this.street_manual.set("");
    this.latitude.set(null);
    this.longitude.set(null);
    this.validFields.update((fields) => ({
      ...fields,
      street: false,
      street_manual: false,
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
  private updateStreetManual(value: string) {
    this.street_manual.set(value);
    const isValid = value.length >= 5;
    console.log('[updateStreetManual] value:', value, 'length:', value.length, 'isValid:', isValid);
    this.validFields.update((fields) => ({
      ...fields,
      street_manual: isValid,
    }));
    console.log('[updateStreetManual] validFields após update:', this.validFields());
    console.log('[updateStreetManual] isFormValid:', this.isFormValid());
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

  private updateEmailClient(value: string) {
    this.email_client.set(value);
    const isValidEmail = !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    this.validFields.update((fields) => ({
      ...fields,
      email_client: isValidEmail,
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
      const isSecretary = this.isSecretary();
      const payload = {
        title: this.title(),
        description: this.description(),
        category_id: this.category_id() ?? 0,
        subcategory_id: this.subcategory_id() ?? 0,
        origin_id: this.origin_id(),
        os: this.os() || null,
        address,
        requested_datetime: this.requestedDateTime(),
        priority: (this.priority() || undefined) as 'Normal' | 'Urgent' | undefined,
        valor: isSecretary ? 0 : (this.valor() ?? 0),
        valor_prestador: isSecretary ? 0 : (this.valor_prestador() ?? 0),
        latitude: this.latitude(),
        longitude: this.longitude(),
        street_manual: this.street_manual() || null,
        // Dados do solicitante
        client_name: this.client_name(),
        client_phone: this.client_phone(),
        client_nif: this.client_nif() || null,
        email_client: this.email_client(),
      };
      const newRequestId = await this.dataService.addServiceRequest(payload);

      const stockItemId = this.selectedStockItemId();
      if (newRequestId && stockItemId) {
        await this.serviceRequestMaterialsService.upsert({
          service_request_id: newRequestId,
          stock_item_id: stockItemId,
          quantity_used: 1,
          created_by_admin_id: this.currentUser()?.id ?? null,
        });
      }
      this.showSuccessMessage(this.i18n.translate("formSuccessGeneric"));
      // Opcional: resetar campos ou fechar modal
      this.closeForm.emit();
      this.isSubmitting.set(false);
    } catch (error) {
      console.error("Erro ao enviar solicitação de serviço:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      this.formError.set(
        this.i18n.translate("formErrorGeneric") +
          (errorMessage ? ` (${errorMessage})` : "")
      );
      this.isSubmitting.set(false);
    }
  }
}

