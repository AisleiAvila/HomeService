import { Component, ChangeDetectionStrategy, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Remover import do I18nPipe se não existir ou corrigir caminho
// Remover import não utilizado
import { ExtraServicesService } from '../../services/extra-services.service';
import { AuthService } from '../../../services/auth.service';
import { I18nPipe } from '../../../pipes/i18n.pipe';
import { DataService } from '../../../services/data.service';
import { ExtraService, User } from '../../../models/maintenance.models';

type ExtraServiceView = ExtraService & {
  professional?: User;
  requestTitle: string;
  requestEndDate: string | null;
};

@Component({
  selector: 'app-extra-services',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './extra-services.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtraServicesPage implements OnInit {
  private readonly extraServicesService = inject(ExtraServicesService);
  private readonly authService = inject(AuthService);
  private readonly dataService = inject(DataService);

  currentUser = this.authService.appUser;
  isAdmin = computed(() => this.currentUser()?.role === 'admin');

  extraServices = this.extraServicesService.extraServices;

  showFilters = signal(true);
  filterService = signal<string>('');
  filterExtraService = signal<string>('');
  filterProfessional = signal<number | ''>('');
  filterStatus = signal<string>('');
  filterPerformedDate = signal<string>('');

  readonly extraServicesView = computed((): ExtraServiceView[] => {
    const users = this.dataService.users();
    const requests = this.dataService.serviceRequests();
    const usersById = new Map(users.map((u) => [u.id, u]));
    const requestsById = new Map(requests.map((r) => [r.id, r]));
    return this.extraServices().map((service) => ({
      ...service,
      professional: usersById.get(service.professional_id),
      requestTitle: requestsById.get(service.service_request_id)?.title ?? "-",
      requestEndDate:
        requestsById.get(service.service_request_id)?.actual_start_datetime ??
        requestsById.get(service.service_request_id)?.work_started_at ??
        requestsById.get(service.service_request_id)?.started_at ??
        null,
    }));
  });

  readonly serviceOptions = computed(() => {
    const unique = new Set<string>();
    this.extraServicesView().forEach((service) => {
      if (service.requestTitle?.trim()) {
        unique.add(service.requestTitle.trim());
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-PT', { sensitivity: 'base' }));
  });

  readonly extraServiceOptions = computed(() => {
    const unique = new Set<string>();
    this.extraServicesView().forEach((service) => {
      if (service.description?.trim()) {
        unique.add(service.description.trim());
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-PT', { sensitivity: 'base' }));
  });

  readonly professionalOptions = computed(() => {
    const professionalIds = new Set<number>();
    this.extraServicesView().forEach((service) => {
      if (service.professional_id) {
        professionalIds.add(service.professional_id);
      }
    });
    return this.dataService
      .users()
      .filter((user) => professionalIds.has(user.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-PT', { sensitivity: 'base' }));
  });

  readonly filteredExtraServicesView = computed((): ExtraServiceView[] => {
    const serviceFilter = this.filterService();
    const extraServiceFilter = this.filterExtraService();
    const professionalFilter = this.filterProfessional();
    const statusFilter = this.filterStatus();
    const performedDateFilter = this.filterPerformedDate();

    let services = this.extraServicesView();

    if (serviceFilter) {
      services = services.filter((service) => service.requestTitle?.trim() === serviceFilter);
    }

    if (extraServiceFilter) {
      services = services.filter((service) => service.description?.trim() === extraServiceFilter);
    }

    if (professionalFilter) {
      services = services.filter((service) => service.professional_id === professionalFilter);
    }

    if (statusFilter) {
      services = services.filter((service) => {
        if (!service.professional?.is_natan_employee) return false;
        if (statusFilter === 'done') return service.has_reimbursement === true;
        if (statusFilter === 'pending') return service.has_reimbursement === false;
        return true;
      });
    }

    if (performedDateFilter) {
      const selected = new Date(performedDateFilter);
      selected.setHours(0, 0, 0, 0);
      const selectedTime = selected.getTime();
      services = services.filter((service) => {
        if (!service.requestEndDate) return false;
        const parsed = new Date(service.requestEndDate);
        if (Number.isNaN(parsed.getTime())) return false;
        parsed.setHours(0, 0, 0, 0);
        return parsed.getTime() === selectedTime;
      });
    }

    return services;
  });

  readonly hasActiveFilters = computed(() => {
    return (
      !!this.filterService() ||
      !!this.filterExtraService() ||
      !!this.filterProfessional() ||
      !!this.filterStatus() ||
      !!this.filterPerformedDate()
    );
  });

  ngOnInit(): void {
    this.extraServicesService.loadExtraServices();
    if (this.dataService.users().length === 0) {
      this.dataService.fetchUsers();
    }
  }
  // Métodos para adicionar/remover serviços extras podem ser implementados aqui

  selectedReimbursementService = signal<ExtraServiceView | null>(null);
  showReimbursementConfirmModal = signal(false);

  openReimbursementConfirmModal(service: ExtraServiceView): void {
    if (!this.canConfirmReimbursement(service)) return;
    this.selectedReimbursementService.set(service);
    this.showReimbursementConfirmModal.set(true);
  }

  closeReimbursementConfirmModal(): void {
    this.showReimbursementConfirmModal.set(false);
    this.selectedReimbursementService.set(null);
  }

  toggleFilters(): void {
    this.showFilters.update((current) => !current);
  }

  clearFilters(): void {
    this.filterService.set('');
    this.filterExtraService.set('');
    this.filterProfessional.set('');
    this.filterStatus.set('');
    this.filterPerformedDate.set('');
  }

  canConfirmReimbursement(service: ExtraServiceView): boolean {
    return service.professional?.is_natan_employee === true && !service.has_reimbursement;
  }

  async confirmReimbursement(): Promise<void> {
    const service = this.selectedReimbursementService();
    if (!service || !this.canConfirmReimbursement(service)) {
      this.closeReimbursementConfirmModal();
      return;
    }
    await this.extraServicesService.confirmReimbursement(service.id);
    this.closeReimbursementConfirmModal();
  }
}
