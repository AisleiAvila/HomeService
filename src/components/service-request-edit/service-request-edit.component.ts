import { Component, ChangeDetectionStrategy, inject, OnInit, ChangeDetectorRef, computed, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { I18nPipe } from '../../pipes/i18n.pipe';
import { DataService } from '../../services/data.service';
import { SupabaseService } from '../../services/supabase.service';
import { ServiceRequest, StockItem, StockItemStatus } from '../../models/maintenance.models';
import { PortugalAddressValidationService } from '../../services/portugal-address-validation.service';
import { WarehouseService } from '../../services/warehouse.service';
import { InventoryService } from '../../services/inventory.service';
import { ServiceRequestMaterialsService } from '../../services/service-request-materials.service';
import {
  localDateTimeToUtcIso,
  normalizeServiceTimeZone,
  utcIsoToLocalParts,
} from '../../utils/timezone-datetime';

@Component({
  selector: 'app-service-request-edit',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  templateUrl: './service-request-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestEditComponent implements OnInit {
      private readonly cdr = inject(ChangeDetectorRef);
    // Getter para lista de origens
    get origins() {
      return this.dataService.origins();
    }
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(DataService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly authService = inject(DataService).authService;
  private readonly addressValidation = inject(PortugalAddressValidationService);
  readonly warehouseService = inject(WarehouseService);
  private readonly inventoryService = inject(InventoryService);
  private readonly serviceRequestMaterialsService = inject(ServiceRequestMaterialsService);

  private readonly serviceTimeZone = signal<string>('Europe/Lisbon');
  readonly selectedWarehouseId = signal<number | null>(null);
  readonly selectedStockItemId = signal<number | null>(null);
  readonly availableStockItems = signal<StockItem[]>([]);
  readonly isLoadingStockItems = signal(false);

  request: ServiceRequest | null = null;
  loading = true;
  error: string | null = null;
  formError = signal<string>('');
  locality = signal<string>('');
  districtName = signal<string>('');
  isSecretary = computed(() => this.authService.appUser()?.role === 'secretario');

  // Getter/Setter para formatar requested_datetime para datetime-local input
  get requestedDateTimeFormatted(): string {
    if (!this.request?.requested_datetime) return '';
    const tz = normalizeServiceTimeZone(this.serviceTimeZone());
    return utcIsoToLocalParts(this.request.requested_datetime, tz).dateTimeLocal;
  }

  set requestedDateTimeFormatted(value: string) {
    if (!this.request) return;

    if (!value) {
      this.request.requested_datetime = undefined;
      if (!this.request.actual_start_datetime) {
        this.request.scheduled_start_datetime = undefined;
      }
      return;
    }

    // O valor digitado deve ser interpretado no fuso do endereço (zip_code).
    const tz = normalizeServiceTimeZone(this.serviceTimeZone());
    const isoUtc = localDateTimeToUtcIso(value, tz);

    this.request.requested_datetime = isoUtc;
    if (!this.request.actual_start_datetime) {
      this.request.scheduled_start_datetime = isoUtc;
    }
  }

  // Computed signal para categorias (filtrar apenas as que têm subcategorias)
  categories = computed(() => {
    const allCats = this.dataService.categories();
    return allCats.filter(cat => 
      Array.isArray(cat.subcategories) && cat.subcategories.length > 0
    );
  });

  // Signal para subcategorias da categoria selecionada
  subcategories = computed(() => {
    if (!this.request?.category_id) return [];
    const selectedCategory = this.categories().find(c => c.id === this.request?.category_id);
    return selectedCategory?.subcategories || [];
  });

  isWortenOrigin = computed(() => {
    const originId = this.request?.origin_id ?? null;
    if (!originId) return false;
    if (originId === 2) return true;

    const originName =
      this.origins.find((origin) => origin.id === originId)?.name || "";
    return originName.toLowerCase().includes("worten");
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'ID inválido';
      this.loading = false;
      return;
    }
    // Carregar origens e categorias (métodos públicos)
    Promise.all([
      this.dataService.fetchOrigins?.(),
      this.dataService.fetchCategories?.(),
      this.warehouseService.fetchWarehouses(),
    ]).then(() => {
      this.request = this.dataService.getServiceRequestById(id) || null;
      console.log('Edit request loaded:', this.request);
      console.log('Origin ID:', this.request?.origin_id);
      console.log('Category ID:', this.request?.category_id);
      console.log('Subcategory ID:', this.request?.subcategory_id);
      console.log('Available origins:', this.origins);
      console.log('Available categories:', this.categories());
      console.log('Available subcategories:', this.subcategories());
      
      // Inicializar campos de endereço derivados
      if (this.request) {
        this.locality.set(this.request.city || '');
        this.districtName.set(this.request.state || '');

        // Inicializar timezone do serviço (preferir valor persistido; fallback via lookup)
        this.serviceTimeZone.set(normalizeServiceTimeZone((this.request as any).service_time_zone));
        void this.refreshTimeZoneFromZip(this.request.zip_code);

        void this.initializeStockSelection();
      }
      
      this.loading = false;
      this.cdr.markForCheck();
    }).catch((e) => {
      console.error('Erro ao carregar dados:', e);
      this.error = 'Erro ao carregar solicitação';
      this.loading = false;
      this.cdr.markForCheck();
    });
    // Fallback: desativa loading após 5s se nada acontecer
    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        if (!this.request) {
          this.error = 'Timeout ao carregar dados.';
        }
        this.cdr.markForCheck();
      }
    }, 5000);
  }

  private async initializeStockSelection(): Promise<void> {
    if (!this.request || !this.isWortenOrigin()) {
      this.resetStockSelection();
      return;
    }

    const associated = await this.serviceRequestMaterialsService.fetchByRequest(this.request.id);
    if (associated.length === 0) {
      this.resetStockSelection();
      return;
    }

    const current = associated[0];
    const currentItem = current.stock_item ?? null;
    const warehouseId =
      currentItem?.warehouse_id ?? currentItem?.warehouse?.id ?? null;

    if (!warehouseId) {
      this.resetStockSelection();
      return;
    }

    this.selectedWarehouseId.set(warehouseId);
    this.selectedStockItemId.set(current.stock_item_id);

    await this.loadEditableStockItems(warehouseId);
    if (currentItem) {
      const exists = this.availableStockItems().some((item) => item.id === currentItem.id);
      if (!exists) {
        this.availableStockItems.update((items) => [currentItem, ...items]);
      }
    }
  }

  onOriginChange(originId: number | null): void {
    if (!this.request) return;
    this.request.origin_id = originId ?? null;

    if (!this.isWortenOrigin()) {
      this.resetStockSelection();
    }
  }

  async onWarehouseChange(warehouseId: string): Promise<void> {
    const parsedId = warehouseId ? Number(warehouseId) : null;
    this.selectedWarehouseId.set(parsedId);
    this.selectedStockItemId.set(null);

    if (!parsedId) {
      this.availableStockItems.set([]);
      return;
    }

    await this.loadEditableStockItems(parsedId);
  }

  onStockItemChange(stockItemId: string): void {
    const parsedId = stockItemId ? Number(stockItemId) : null;
    this.selectedStockItemId.set(parsedId);
  }

  private async loadEditableStockItems(warehouseId: number): Promise<void> {
    this.isLoadingStockItems.set(true);
    try {
      if (!this.request) {
        this.availableStockItems.set([]);
        return;
      }
      const items = await this.inventoryService.fetchReceivedStockItemsByWarehouseForEdit(
        warehouseId,
        this.request.id
      );
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

  private async refreshTimeZoneFromZip(zipCode: string) {
    try {
      const tz = normalizeServiceTimeZone(
        await this.addressValidation.getTimeZoneForZipCode(zipCode)
      );
      if (tz !== this.serviceTimeZone()) {
        this.serviceTimeZone.set(tz);
        if (this.request) {
          this.request.service_time_zone = tz;
        }
        this.cdr.markForCheck();
      }
    } catch (e) {
      console.warn('[ServiceRequestEdit] Falha ao derivar timezone via zip_code:', e);
    }
  }

  onCategoryChange(event: Event): void {
    if (!this.request) return;
    const categoryId = Number((event.target as HTMLSelectElement).value);
    this.request.category_id = categoryId;
    
    // Reset subcategoria quando categoria mudar
    this.request.subcategory_id = null;
    
    // Forçar detecção de mudanças para atualizar o computed signal de subcategories
    this.cdr.markForCheck();
  }

  // TrackBy functions para melhor performance
  trackOrigin(_index: number, item: any): number {
    return item.id;
  }

  trackCategory(_index: number, item: any): number {
    return item.id;
  }

  trackSubcategory(_index: number, item: any): number {
    return item.id;
  }

  async onZipCodeChange(postalCode: string): Promise<void> {
    if (!this.request) return;
    
    const formatted = this.formatZipCode(postalCode);
    this.request.zip_code = formatted;
    
    const isValidZip = this.isValidPostalCode(formatted);

    if (isValidZip) {
      await this.fetchPostalCodeInfo(formatted);
      await this.refreshTimeZoneFromZip(formatted);
    } else {
      this.clearAddressFields();
    }
    
    this.cdr.markForCheck();
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

  private async fetchPostalCodeInfo(formatted: string): Promise<void> {
    try {
      const result = await this.dataService.getPostalCodeInfo(formatted);
      if (result) {
        this.populateAddressFields(result);
        this.formError.set('');
      } else {
        this.clearAddressFields();
        this.formError.set('Código postal não encontrado.');
      }
    } catch (error) {
      console.error('Erro ao buscar informações do código postal:', error);
      this.formError.set('Erro ao buscar informações do código postal.');
    }
  }

  private populateAddressFields(result: any): void {
    if (!this.request) return;
    
    this.request.street = result.arteria_completa || '';
    this.request.city = result.concelho || '';
    this.request.state = result.distrito || '';
    this.locality.set(result.localidade || '');
    this.districtName.set(result.distrito || '');
    
    this.cdr.markForCheck();
  }

  private clearAddressFields(): void {
    if (!this.request) return;
    
    this.request.street = '';
    this.request.city = '';
    this.request.state = '';
    this.locality.set('');
    this.districtName.set('');
    
    this.cdr.markForCheck();
  }

  private isValidPostalCode(postalCode: string): boolean {
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

  async save() {
    if (!this.request) return;
    this.loading = true;
    try {
      const tz = normalizeServiceTimeZone(this.serviceTimeZone());

      const updates: Partial<ServiceRequest> = {
        street: this.request.street,
        street_number: this.request.street_number,
        street_manual: this.request.street_manual,
        complement: this.request.complement,
        city: this.request.city,
        state: this.request.state,
        zip_code: this.request.zip_code,
        service_time_zone: tz,
        latitude: this.request.latitude,
        longitude: this.request.longitude,
        description: this.request.description,
        requested_datetime: this.request.requested_datetime,
        priority: this.request.priority,
        scheduled_start_datetime: this.request.scheduled_start_datetime,
        estimated_duration_minutes: this.request.estimated_duration_minutes,
        admin_notes: this.request.admin_notes,
        category_id: this.request.category_id,
        subcategory_id: this.request.subcategory_id,
        origin_id: this.request.origin_id,
        os: this.request.os,
        client_name: this.request.client_name,
        client_phone: this.request.client_phone,
        client_nif: this.request.client_nif,
        email_client: this.request.email_client,
        title: this.request.title,
        valor: this.request.valor,
        valor_prestador: this.request.valor_prestador,
      };

      if (this.isSecretary()) {
        delete updates.valor;
        delete updates.valor_prestador;
      }
      
      console.log('Dados sendo salvos:', updates);
      console.log('ID da solicitação:', this.request.id);
      console.log('Número do endereço especificamente:', updates.street_number);
      
      const { data, error } = await this.supabaseService.client
        .from('service_requests')
        .update(updates)
        .is('deleted_at', null)
        .eq('id', this.request.id)
        .select();
      
      if (error) {
        console.error('Erro retornado do Supabase:', error);
        throw error;
      }
      
      console.log('Dados atualizados no Supabase:', data);
      
      await this.dataService.reloadServiceRequests();
      
      // Verificar se os dados foram realmente atualizados
      const updatedRequest = this.dataService.getServiceRequestById(this.request.id);
      console.log('Dados após reload:', updatedRequest);
      
      await this.handleWortenMaterialAssociation();

      const role = this.authService.appUser()?.role;
      this.router.navigate([role === 'secretario' ? '/requests' : '/admin/requests']);
    } catch (e) {
      console.error('Erro ao salvar:', e);
      this.error = 'Erro ao salvar alterações';
      this.cdr.markForCheck();
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private async handleWortenMaterialAssociation(): Promise<void> {
    if (!this.request || !this.isWortenOrigin()) {
      return;
    }

    const selectedId = this.selectedStockItemId();
    const associated = await this.serviceRequestMaterialsService.fetchByRequest(this.request.id);
    const associatedById = new Map(
      associated.map((material) => [material.stock_item_id, material])
    );

    if (selectedId) {
      for (const material of associated) {
        if (material.stock_item_id !== selectedId) {
          await this.serviceRequestMaterialsService.removeById(material.id);
          if (material.stock_item) {
            await this.updateStockItemAssociation(material.stock_item, null, "Recebido");
          } else {
            await this.inventoryService.updateStockItem(material.stock_item_id, {
              service_request_id: null,
              status: "Recebido",
            });
          }
        }
      }

      if (!associatedById.has(selectedId)) {
        await this.serviceRequestMaterialsService.upsert({
          service_request_id: this.request.id,
          stock_item_id: selectedId,
          quantity_used: 1,
          created_by_admin_id: this.authService.appUser()?.id ?? null,
        });
      }

      return;
    }

    for (const material of associated) {
      await this.serviceRequestMaterialsService.removeById(material.id);
      if (material.stock_item) {
        await this.updateStockItemAssociation(material.stock_item, null, "Recebido");
      } else {
        await this.inventoryService.updateStockItem(material.stock_item_id, {
          service_request_id: null,
          status: "Recebido",
        });
      }
    }
  }

  private async updateStockItemAssociation(
    item: StockItem,
    serviceRequestId: number | null,
    status: StockItemStatus
  ): Promise<void> {
    if (item.service_request_id === serviceRequestId && item.status === status) {
      return;
    }

    await this.inventoryService.updateStockItem(item.id, {
      service_request_id: serviceRequestId,
      status,
    });
  }

  cancel() {
    const role = this.authService.appUser()?.role;
    this.router.navigate([role === 'secretario' ? '/requests' : '/admin/requests']);
  }
}

