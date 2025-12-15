import { Component, ChangeDetectionStrategy, inject, OnInit, ChangeDetectorRef, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { I18nPipe } from '../../pipes/i18n.pipe';
import { DataService } from '../../services/data.service';
import { SupabaseService } from '../../services/supabase.service';
import { ServiceRequest } from '../../models/maintenance.models';

@Component({
  selector: 'app-service-request-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
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

  request: ServiceRequest | null = null;
  loading = true;
  error: string | null = null;
  formError = signal<string>('');
  locality = signal<string>('');
  district = signal<string>('');

  // Getter/Setter para formatar requested_datetime para datetime-local input
  get requestedDateTimeFormatted(): string {
    if (!this.request?.requested_datetime) return '';
    // Converter ISO string para formato datetime-local (YYYY-MM-DDTHH:mm)
    const date = new Date(this.request.requested_datetime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  set requestedDateTimeFormatted(value: string) {
    if (!this.request) return;
    // Converter de datetime-local para ISO string
    this.request.requested_datetime = value ? new Date(value).toISOString() : undefined;
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
      this.dataService.fetchCategories?.()
    ]).then(() => {
      this.request = this.dataService.getServiceRequestById(id) || null;
      console.log('Edit request loaded:', this.request);
      
      // Inicializar campos de endereço derivados
      if (this.request) {
        this.locality.set(this.request.city || '');
        this.district.set(this.request.state || '');
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
    this.district.set(result.distrito || '');
    
    this.cdr.markForCheck();
  }

  private clearAddressFields(): void {
    if (!this.request) return;
    
    this.request.street = '';
    this.request.city = '';
    this.request.state = '';
    this.locality.set('');
    this.district.set('');
    
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
      const updates = {
        street: this.request.street,
        street_number: this.request.street_number,
        street_manual: this.request.street_manual,
        complement: this.request.complement,
        city: this.request.city,
        state: this.request.state,
        zip_code: this.request.zip_code,
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
        client_name: this.request.client_name,
        client_phone: this.request.client_phone,
        client_nif: this.request.client_nif,
        email_client: this.request.email_client,
      };
      await this.supabaseService.client
        .from('service_requests')
        .update(updates)
        .eq('id', this.request.id);
      await this.dataService.reloadServiceRequests();
      this.router.navigate(['/admin/requests']);
    } catch (e) {
      console.error(e);
      this.error = 'Erro ao salvar alterações';
    } finally {
      this.loading = false;
    }
  }

  cancel() {
    this.router.navigate(['/admin/requests']);
  }
}

