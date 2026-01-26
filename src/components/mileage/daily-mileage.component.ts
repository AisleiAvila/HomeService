import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../i18n.service';
import { DailyMileage } from '../../models/maintenance.models';
import { I18nPipe } from '../../pipes/i18n.pipe';
import { AuthService } from '../../services/auth.service';
import { DailyMileageService } from '../../services/daily-mileage.service';

@Component({
  selector: 'app-daily-mileage',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './daily-mileage.component.html',
  styleUrls: ['./daily-mileage.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailyMileageComponent implements OnInit {
  private readonly dailyMileageService = inject(DailyMileageService);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);

  // Current user
  currentUser = this.authService.appUser;

  // Form states
  showStartForm = signal(false);
  showEndForm = signal(false);
  showAdminRegisterForm = signal(false);
  selectedDailyMileage = signal<DailyMileage | null>(null);
  showFilters = signal(false);

  // Start day form
  startDate = signal(new Date().toISOString().split('T')[0]);
  startKilometers = signal<number | null>(null);

  // End day form
  endKilometers = signal<number | null>(null);

  // Fueling form
  showFuelingForm = signal(false);
  fuelingValue = signal<number | null>(null);
  fuelingReceiptFile = signal<File | null>(null);
  hasFueling = signal(false);

  // Modal fueling form (for admins)
  showModalFuelingForm = signal(false);

  // Admin register mileage form
  adminRegisterDate = signal(new Date().toISOString().split('T')[0]);
  adminRegisterProfessionalId = signal<number | null>(null);
  adminRegisterStartKilometers = signal<number | null>(null);
  adminRegisterEndKilometers = signal<number | null>(null);

  // Filter states
  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');
  filterMinDriven = signal<number | null>(null);
  filterMaxDriven = signal<number | null>(null);
  filterMinFueling = signal<number | null>(null);
  filterMaxFueling = signal<number | null>(null);
  filterProfessionalId = signal<number | null>(null);

  // Sorting states
  sortBy = signal<'date' | 'driven' | 'fueling'>('date');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Pagination states
  itemsPerPage = signal(10);
  currentPage = signal(1);

  // Computed
  dailyMileages = computed(() => this.dailyMileageService.dailyMileages());
  fuelings = computed(() => this.dailyMileageService.fuelings());
  isAdmin = computed(() => this.currentUser()?.role === 'admin');
  professionals = computed(() => this.dailyMileageService.professionals());
  todayMileage = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    const user = this.currentUser();
    if (this.isAdmin()) {
      return null; // Admins não têm "hoje" específico
    }
    return this.dailyMileages().find(dm => dm.date === today && dm.professional_id === user?.id);
  });

  // Filtered and sorted mileages
  filteredMileages = computed(() => {
    let mileages = this.dailyMileages();
    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();
    const minDriven = this.filterMinDriven();
    const maxDriven = this.filterMaxDriven();
    const minFueling = this.filterMinFueling();
    const maxFueling = this.filterMaxFueling();
    const professionalId = this.filterProfessionalId();

    // Para profissionais, filtrar apenas seus próprios registros
    if (!this.isAdmin()) {
      const user = this.currentUser();
      if (user) {
        mileages = mileages.filter(m => m.professional_id === user.id);
      }
    }

    if (professionalId !== null) {
      mileages = mileages.filter(m => m.professional_id === professionalId);
    }

    if (startDate) {
      mileages = mileages.filter(m => m.date >= startDate);
    }
    if (endDate) {
      mileages = mileages.filter(m => m.date <= endDate);
    }
    if (minDriven !== null) {
      mileages = mileages.filter(m => this.getKilometersDriven(m) >= minDriven);
    }
    if (maxDriven !== null) {
      mileages = mileages.filter(m => this.getKilometersDriven(m) <= maxDriven);
    }
    if (minFueling !== null) {
      mileages = mileages.filter(m => this.getTotalFueling(m) >= minFueling);
    }
    if (maxFueling !== null) {
      mileages = mileages.filter(m => this.getTotalFueling(m) <= maxFueling);
    }

    // Sorting
    mileages = [...mileages].sort((a, b) => {
      let aValue: any, bValue: any;
      switch (this.sortBy()) {
        case 'date':
          aValue = a.date;
          bValue = b.date;
          break;
        case 'driven':
          aValue = this.getKilometersDriven(a);
          bValue = this.getKilometersDriven(b);
          break;
        case 'fueling':
          aValue = this.getTotalFueling(a);
          bValue = this.getTotalFueling(b);
          break;
      }
      if (aValue < bValue) return this.sortOrder() === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortOrder() === 'asc' ? 1 : -1;
      return 0;
    });

    return mileages;
  });

  // Paginated mileages
  paginatedMileages = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredMileages().slice(start, start + this.itemsPerPage());
  });

  // Pagination info
  totalPages = computed(() => Math.ceil(this.filteredMileages().length / this.itemsPerPage()));
  hasPreviousPage = computed(() => this.currentPage() > 1);
  hasNextPage = computed(() => this.currentPage() < this.totalPages());

  // Active filters
  activeFilters = computed(() => {
    const filters = [];
    if (this.filterStartDate()) {
      filters.push({ key: 'startDate', labelKey: 'startDate', value: this.filterStartDate() });
    }
    if (this.filterEndDate()) {
      filters.push({ key: 'endDate', labelKey: 'endDate', value: this.filterEndDate() });
    }
    if (this.filterMinDriven() !== null) {
      filters.push({ key: 'minDriven', labelKey: 'minDriven', value: this.filterMinDriven()?.toString() });
    }
    if (this.filterMaxDriven() !== null) {
      filters.push({ key: 'maxDriven', labelKey: 'maxDriven', value: this.filterMaxDriven()?.toString() });
    }
    if (this.filterMinFueling() !== null) {
      filters.push({ key: 'minFueling', labelKey: 'minFueling', value: this.filterMinFueling()?.toString() });
    }
    if (this.filterMaxFueling() !== null) {
      filters.push({ key: 'maxFueling', labelKey: 'maxFueling', value: this.filterMaxFueling()?.toString() });
    }
    if (this.filterProfessionalId() !== null) {
      const professional = this.professionals().find(p => p.id === this.filterProfessionalId());
      filters.push({ key: 'professional', labelKey: 'professional', value: professional?.name || '' });
    }
    return filters;
  });

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (user?.role === 'professional' || user?.role === 'admin') {
        this.loadData();
      }
    });

    // Reset page when filters change
    effect(() => {
      this.filterStartDate();
      this.filterEndDate();
      this.filterMinDriven();
      this.filterMaxDriven();
      this.filterMinFueling();
      this.filterMaxFueling();
      this.filterProfessionalId();
      this.currentPage.set(1);
    });
  }

  ngOnInit() {
    this.loadData();
    // Set default date filters: start of month to today
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.filterStartDate.set(firstDayOfMonth.toISOString().split('T')[0]);
    this.filterEndDate.set(today.toISOString().split('T')[0]);
  }

  // Helper methods for number conversion
  onStartKilometersChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    this.startKilometers.set(Number(value) || null);
  }

  onEndKilometersChange(value: string) {
    this.endKilometers.set(Number(value) || null);
  }

  onFuelingValueChange(value: string) {
    this.fuelingValue.set(Number(value) || null);
  }

  onFilterMinDrivenChange(value: string) {
    this.filterMinDriven.set(Number(value) || null);
  }

  onFilterMaxDrivenChange(value: string) {
    this.filterMaxDriven.set(Number(value) || null);
  }

  onFilterMinFuelingChange(value: string) {
    this.filterMinFueling.set(Number(value) || null);
  }

  onFilterMaxFuelingChange(value: string) {
    this.filterMaxFueling.set(Number(value) || null);
  }

  onFilterProfessionalChange(value: string) {
    this.filterProfessionalId.set(Number(value) || null);
  }

  onAdminProfessionalChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    this.adminRegisterProfessionalId.set(value === '' ? null : Number(value));
  }

  onAdminRegisterStartKilometersChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    this.adminRegisterStartKilometers.set(Number(value) || null);
  }

  onAdminRegisterEndKilometersChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    this.adminRegisterEndKilometers.set(Number(value) || null);
  }

  getProfessionalName(professionalId: number): string {
    const professional = this.professionals().find(p => p.id === professionalId);
    return professional?.name || 'Desconhecido';
  }

  async loadData() {
    const user = this.currentUser();
    if (user) {
      if (this.isAdmin()) {
        // Admin carrega dados de todos os profissionais
        await this.dailyMileageService.loadAllDailyMileages();
        await this.dailyMileageService.loadProfessionals();
      } else {
        // Profissional carrega apenas seus dados
        await this.dailyMileageService.loadDailyMileages(user.id);
      }
      // Carregar todos os fuelings para exibir totais corretos
      await this.dailyMileageService.loadAllFuelings();
    }
  }

  async startDay() {
    const user = this.currentUser();
    if (user?.role !== 'professional') {
      alert('Apenas profissionais podem registrar quilometragem.');
      return;
    }

    const startKm = Number(this.startKilometers());
    if (Number.isNaN(startKm) || startKm < 0) {
      alert('Por favor, insira uma quilometragem inicial válida.');
      return;
    }

    const dailyMileage = await this.dailyMileageService.createDailyMileage({
      professional_id: user.id,
      date: this.startDate(),
      start_kilometers: startKm,
    });

    if (dailyMileage) {
      this.showStartForm.set(false);
      this.startKilometers.set(null);
      await this.loadData();
    }
  }

  async endDay() {
    const user = this.currentUser();
    if (user?.role !== 'professional') {
      alert('Apenas profissionais podem registrar quilometragem.');
      return;
    }

    const todayMileage = this.todayMileage();
    if (!todayMileage) {
      alert('Não há uma quilometragem iniciada para hoje.');
      return;
    }

    const endKm = Number(this.endKilometers());
    if (!endKm || endKm < todayMileage.start_kilometers) {
      alert('A quilometragem final deve ser maior ou igual à inicial.');
      return;
    }

    await this.dailyMileageService.updateDailyMileage(todayMileage.id, {
      end_kilometers: endKm,
    });

    this.showEndForm.set(false);
    this.endKilometers.set(null);
    await this.loadData();
  }

  async addFueling() {
    const user = this.currentUser();
    if (user?.role !== 'professional') {
      alert('Apenas profissionais podem registrar abastecimentos.');
      return;
    }

    const todayMileage = this.todayMileage();
    if (!todayMileage) {
      alert('Não há uma quilometragem iniciada para hoje.');
      return;
    }

    const fuelValue = Number(this.fuelingValue());
    if (!fuelValue || fuelValue <= 0) {
      alert('Por favor, insira um valor válido para o abastecimento.');
      return;
    }

    let receiptUrl: string | undefined;
    if (this.fuelingReceiptFile()) {
      receiptUrl = await this.dailyMileageService.uploadReceiptImage(this.fuelingReceiptFile());
    }

    await this.dailyMileageService.addFueling({
      daily_mileage_id: todayMileage.id,
      value: fuelValue,
      receipt_image_url: receiptUrl,
    });

    this.showFuelingForm.set(false);
    this.fuelingValue.set(null);
    this.fuelingReceiptFile.set(null);
    this.hasFueling.set(false);
  }

  async addFuelingToMileage(dailyMileageId: number) {
    const user = this.currentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'professional')) {
      alert('Apenas administradores e profissionais podem registrar abastecimentos.');
      return;
    }

    const fuelValue = Number(this.fuelingValue());
    if (!fuelValue || fuelValue <= 0) {
      alert('Por favor, insira um valor válido para o abastecimento.');
      return;
    }

    let receiptUrl: string | undefined;
    if (this.fuelingReceiptFile()) {
      receiptUrl = await this.dailyMileageService.uploadReceiptImage(this.fuelingReceiptFile());
    }

    await this.dailyMileageService.addFueling({
      daily_mileage_id: dailyMileageId,
      value: fuelValue,
      receipt_image_url: receiptUrl,
    });

    this.showModalFuelingForm.set(false);
    this.fuelingValue.set(null);
    this.fuelingReceiptFile.set(null);
    this.hasFueling.set(false);
  }

  async registerMileageAsAdmin() {
    const user = this.currentUser();
    if (user?.role !== 'admin') {
      alert('Apenas administradores podem cadastrar quilometragem.');
      return;
    }

    const professionalId = this.adminRegisterProfessionalId();
    const startKm = Number(this.adminRegisterStartKilometers());
    const endKm = this.adminRegisterEndKilometers() ? Number(this.adminRegisterEndKilometers()) : null;

    if (professionalId == null) {
      alert('Por favor, selecione um profissional.');
      return;
    }

    if (Number.isNaN(startKm) || startKm < 0) {
      alert('Por favor, insira uma quilometragem inicial válida.');
      return;
    }

    if (endKm !== null && (Number.isNaN(endKm) || endKm < startKm)) {
      alert('A quilometragem final deve ser maior ou igual à inicial.');
      return;
    }

    const dailyMileage = await this.dailyMileageService.createDailyMileage({
      professional_id: professionalId,
      date: this.adminRegisterDate(),
      start_kilometers: startKm,
      end_kilometers: endKm,
    });

    if (dailyMileage) {
      this.showAdminRegisterForm.set(false);
      this.adminRegisterProfessionalId.set(null);
      this.adminRegisterStartKilometers.set(null);
      this.adminRegisterEndKilometers.set(null);
      await this.loadData();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.fuelingReceiptFile.set(input.files[0]);
    }
  }

  viewFuelings(dailyMileage: DailyMileage) {
    this.selectedDailyMileage.set(dailyMileage);
    // Fuelings já estão carregados em loadData, então apenas abre o modal
  }

  getTotalFueling(dailyMileage: DailyMileage): number {
    return this.fuelings()
      .filter(f => f.daily_mileage_id === dailyMileage.id)
      .reduce((sum, f) => sum + f.value, 0);
  }

  getKilometersDriven(dailyMileage: DailyMileage): number {
    if (!dailyMileage.end_kilometers) return 0;
    return dailyMileage.end_kilometers - dailyMileage.start_kilometers;
  }

  clearFilter(key: string) {
    switch (key) {
      case 'startDate':
        this.filterStartDate.set('');
        break;
      case 'endDate':
        this.filterEndDate.set('');
        break;
      case 'minDriven':
        this.filterMinDriven.set(null);
        break;
      case 'maxDriven':
        this.filterMaxDriven.set(null);
        break;
      case 'minFueling':
        this.filterMinFueling.set(null);
        break;
      case 'maxFueling':
        this.filterMaxFueling.set(null);
        break;
    }
  }

  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  sortByColumn(column: 'date' | 'driven' | 'fueling') {
    if (this.sortBy() === column) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(column);
      this.sortOrder.set('desc'); // Default to desc for new sort
    }
    this.currentPage.set(1); // Reset to first page on sort
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  previousPage() {
    if (this.hasPreviousPage()) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPage() {
    if (this.hasNextPage()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }
}