import { Component, ChangeDetectionStrategy, inject, OnInit, ChangeDetectorRef } from '@angular/core';
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

  async save() {
    if (!this.request) return;
    this.loading = true;
    try {
      const updates = {
        street: this.request.street,
        city: this.request.city,
        state: this.request.state,
        zip_code: this.request.zip_code,
        description: this.request.description,
        scheduled_start_datetime: this.request.scheduled_start_datetime,
        estimated_duration_minutes: this.request.estimated_duration_minutes,
        admin_notes: this.request.admin_notes,
      };
      await this.supabaseService.client
        .from('service_requests')
        .update(updates)
        .eq('id', this.request.id);
      await this.dataService.reloadServiceRequests();
      this.router.navigate(['/admin/service-requests']);
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
