import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { I18nPipe } from '../../pipes/i18n.pipe';
import { ServiceRequest } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';
import { WorkflowServiceSimplified } from '../../services/workflow-simplified.service';

@Component({
  selector: 'app-service-request-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './service-request-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestEditComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(DataService);
  private readonly workflowService = inject(WorkflowServiceSimplified);
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
    try {
      this.request = this.dataService.getServiceRequestById(id) || null;
      this.loading = false;
    } catch (e) {
      console.error(e);
      this.error = 'Erro ao carregar solicitação';
      this.loading = false;
    }
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
      const currentUser = this.authService.appUser();
      const adminId = currentUser ? currentUser.id : null;
      await this.workflowService.editServiceRequest(this.request.id, updates, adminId);
      this.router.navigate(['/admin/service-requests']);
    } catch (e) {
      console.error(e);
      this.error = 'Erro ao salvar alterações';
    } finally {
      this.loading = false;
    }
  }

  cancel() {
    this.router.navigate(['/admin/service-requests']);
  }
}
