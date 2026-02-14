import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../i18n.service';
import { DailyMileage, Fueling } from '../../models/maintenance.models';
import { I18nPipe } from '../../pipes/i18n.pipe';
import { AuthService } from '../../services/auth.service';
import { DailyMileageService } from '../../services/daily-mileage.service';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-daily-mileage',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './daily-mileage.component.html',
  styleUrls: ['./daily-mileage.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailyMileageComponent implements OnInit {
    openStartDayForm() {
      const user = this.currentUser();
      if (user?.role === 'professional') {
        const lastPlate = this.getLastLicensePlateForProfessional(user.id);
        this.startLicensePlate.set(lastPlate);
      }
      this.showStartForm.set(true);
    }
  // Cards de resumo baseados nos filtros
  totalDriven = computed(() => {
    return this.filteredMileages().reduce((sum, m) => sum + this.getKilometersDriven(m), 0);
  });
  totalFueling = computed(() => {
    return this.filteredMileages().reduce((sum, m) => sum + this.getTotalFueling(m), 0);
  });
  // Abastecimentos filtrados para o modal
  filteredFuelingsForSelectedMileage = computed(() => {
    const selected = this.selectedDailyMileage();
    if (selected === null) return [];
    return this.fuelings().filter(f => f.daily_mileage_id === selected.id);
  });
  private readonly dailyMileageService = inject(DailyMileageService);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);
  // Modal de edição de abastecimento
  editingFueling = signal<Fueling | null>(null);
  editFuelingValue = signal<number | null>(null);
  editFuelingLicensePlate = signal('');
  editFuelingReceiptFile = signal<File | null>(null);

  openEditFueling(fueling: Fueling) {
    this.editingFueling.set(fueling);
    this.editFuelingValue.set(fueling.value);
    this.editFuelingLicensePlate.set(fueling.license_plate || '');
    this.editFuelingReceiptFile.set(null);
  }

  closeEditFueling() {
    this.editingFueling.set(null);
    this.editFuelingValue.set(null);
    this.editFuelingLicensePlate.set('');
    this.editFuelingReceiptFile.set(null);
  }

  async saveEditedFueling() {
    const fueling = this.editingFueling();
    if (!fueling) return;
    const value = this.editFuelingValue() ?? undefined;
    const licensePlate = this.editFuelingLicensePlate().trim();
    let receiptUrl = fueling.receipt_image_url;
    const file = this.editFuelingReceiptFile();
    if (file) {
      const uploadedUrl = await this.dailyMileageService.uploadReceiptImage(file);
      receiptUrl = uploadedUrl ?? undefined;
    }
    await this.dailyMileageService.updateFueling(fueling.id, {
      value,
      license_plate: licensePlate,
      receipt_image_url: receiptUrl,
    });
    this.closeEditFueling();
    await this.loadData();
  }

  async deleteFueling(fueling: Fueling) {
    if (!confirm('Deseja realmente excluir este abastecimento?')) return;
    await this.dailyMileageService.deleteFueling(fueling.id);
    await this.loadData();
  }
  // Current user
  currentUser = this.authService.appUser;

  // Form states
  showStartForm = signal(false);
  showEndForm = signal(false);
  showAdminRegisterForm = signal(false);
  selectedDailyMileage = signal<DailyMileage | null>(null);
  showFilters = signal(false);

  // Edit daily mileage (history)
  editingDailyMileage = signal<DailyMileage | null>(null);
  editLicensePlate = signal('');
  editStartKilometers = signal<number | null>(null);
  editEndKilometers = signal<number | null>(null);

  // Start day form
  startDate = signal(new Date().toISOString().split('T')[0]);
  startKilometers = signal<number | null>(null);
  startLicensePlate = signal('');

  // End day form
  endKilometers = signal<number | null>(null);

  // Fueling form
  showFuelingForm = signal(false);
  fuelingValue = signal<number | null>(null);
  fuelingLicensePlate = signal('');
  fuelingReceiptFile = signal<File | null>(null);
  hasFueling = signal(false);

  // Modal fueling form (for admins)
  showModalFuelingForm = signal(false);

  // Admin register mileage form
  adminRegisterDate = signal(new Date().toISOString().split('T')[0]);
  adminRegisterProfessionalId = signal<number | null>(null);
  adminRegisterLicensePlate = signal('');
  adminRegisterStartKilometers = signal<number | null>(null);
  adminRegisterEndKilometers = signal<number | null>(null);

  // Filter states
  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');
  filterMinDriven = signal<number | null>(null);
  filterMaxDriven = signal<number | null>(null);
  filterMinFueling = signal<number | null>(null);
  filterMaxFueling = signal<number | null>(null);
  filterLicensePlate = signal<string>('');
  filterProfessionalId = signal<number | null>(null);

  // Sorting states
  sortBy = signal<'date' | 'driven' | 'fueling' | 'professional' | 'licensePlate' | 'initial' | 'final' | 'kilometers'>('date');
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
    const licensePlateFilter = this.filterLicensePlate().trim().toLowerCase();
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
    if (licensePlateFilter) {
      mileages = mileages.filter(m => this.getLicensePlateForMileage(m).toLowerCase().includes(licensePlateFilter));
    }

    // Sorting
    mileages = [...mileages].sort((a, b) => {
      let aValue: any, bValue: any;
      switch (this.sortBy()) {
        case 'date':
          aValue = a.date;
          bValue = b.date;
          break;
        case 'professional':
          aValue = this.getProfessionalName(a.professional_id);
          bValue = this.getProfessionalName(b.professional_id);
          break;
        case 'licensePlate':
          aValue = this.getLicensePlateForMileage(a);
          bValue = this.getLicensePlateForMileage(b);
          break;
        case 'initial':
          aValue = a.start_kilometers;
          bValue = b.start_kilometers;
          break;
        case 'final':
          aValue = a.end_kilometers || 0;
          bValue = b.end_kilometers || 0;
          break;
        case 'kilometers':
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
    if (this.filterLicensePlate().trim()) {
      filters.push({ key: 'licensePlate', labelKey: 'licensePlate', value: this.filterLicensePlate().trim() });
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
      this.filterLicensePlate();
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

  onStartLicensePlateChange(value: string) {
    this.startLicensePlate.set(value);
  }

  onEndKilometersChange(value: string) {
    this.endKilometers.set(Number(value) || null);
  }

  onEditStartKilometersChange(value: string) {
    if (value === '') {
      this.editStartKilometers.set(null);
      return;
    }

    const next = Number(value);
    if (Number.isNaN(next)) {
      this.editStartKilometers.set(null);
      return;
    }

    this.editStartKilometers.set(next);
  }

  onEditEndKilometersChange(value: string) {
    if (value === '') {
      this.editEndKilometers.set(null);
      return;
    }

    const next = Number(value);
    if (Number.isNaN(next)) {
      this.editEndKilometers.set(null);
      return;
    }

    this.editEndKilometers.set(next);
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

  onFilterLicensePlateChange(value: string) {
    this.filterLicensePlate.set(value);
  }

  onFilterProfessionalChange(value: string | number) {
    if (value === '' || value === null || value === undefined) {
      this.filterProfessionalId.set(null);
      return;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    this.filterProfessionalId.set(Number.isNaN(parsed) ? null : parsed);
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

    // Verifica se já existe registro para a data selecionada
    const selectedDate = this.startDate();
    const userId = user.id;
    const exists = this.dailyMileages().some(m => m.professional_id === userId && m.date === selectedDate);
    if (exists) {
      alert('Já existe uma quilometragem registrada para esta data.');
      return;
    }

    const startKm = Number(this.startKilometers());
    if (Number.isNaN(startKm) || startKm < 0) {
      alert('Por favor, insira uma quilometragem inicial válida.');
      return;
    }

    const licensePlate = this.startLicensePlate().trim();
    if (!licensePlate) {
      alert('Por favor, informe a matrícula.');
      return;
    }

    const dailyMileage = await this.dailyMileageService.createDailyMileage({
      professional_id: user.id,
      date: this.startDate(),
      start_kilometers: startKm,
      license_plate: licensePlate,
    });

    if (dailyMileage) {
      this.showStartForm.set(false);
      this.startKilometers.set(null);
      this.startLicensePlate.set('');
      await this.loadData();
    }
  }

  getLastLicensePlateForProfessional(professionalId?: number): string {
    if (!professionalId) return '';
    // Busca o último abastecimento do profissional
    const lastFueling = [...this.fuelings()]
      .filter(f => {
        const mileage = this.dailyMileages().find(dm => dm.id === f.daily_mileage_id);
        return mileage?.professional_id === professionalId && f.license_plate;
      })
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
    return lastFueling?.license_plate?.trim() || '';
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

    const licensePlate = this.fuelingLicensePlate().trim();
    if (!licensePlate) {
      alert('Por favor, informe a matrícula.');
      return;
    }

    let receiptUrl: string | undefined;
    const file = this.fuelingReceiptFile();
    if (file) {
      const uploadedUrl = await this.dailyMileageService.uploadReceiptImage(file);
      receiptUrl = uploadedUrl ?? undefined;
    }

    await this.dailyMileageService.addFueling({
      daily_mileage_id: todayMileage.id,
      value: fuelValue,
      license_plate: licensePlate,
      receipt_image_url: receiptUrl,
    });

    this.showFuelingForm.set(false);
    this.fuelingValue.set(null);
    this.fuelingLicensePlate.set('');
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
    const file = this.fuelingReceiptFile();
    if (file) {
      const uploadedUrl = await this.dailyMileageService.uploadReceiptImage(file);
      receiptUrl = uploadedUrl ?? undefined;
    }

    await this.dailyMileageService.addFueling({
      daily_mileage_id: dailyMileageId,
      value: fuelValue,
      license_plate: this.fuelingLicensePlate() || null,
      receipt_image_url: receiptUrl,
    });

    this.showModalFuelingForm.set(false);
    this.fuelingValue.set(null);
    this.fuelingLicensePlate.set('');
    this.fuelingReceiptFile.set(null);
    this.hasFueling.set(false);
    this.selectedDailyMileage.set(null);
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

    const licensePlate = this.adminRegisterLicensePlate().trim();
    if (!licensePlate) {
      alert('Por favor, informe a matrícula.');
      return;
    }

    const selectedDate = this.adminRegisterDate();
    const hasExisting = this.dailyMileages().some(m => m.professional_id === professionalId && m.date === selectedDate);
    if (hasExisting) {
      alert('Já existe uma quilometragem registrada para este profissional nesta data.');
      return;
    }

    const dailyMileage = await this.dailyMileageService.createDailyMileage({
      professional_id: professionalId,
      date: selectedDate,
      license_plate: licensePlate,
      start_kilometers: startKm,
      end_kilometers: endKm ?? undefined,
    });

    if (dailyMileage) {
      this.showAdminRegisterForm.set(false);
      this.adminRegisterProfessionalId.set(null);
      this.adminRegisterLicensePlate.set('');
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

  getLicensePlateForMileage(dailyMileage: DailyMileage): string {
    const directPlate = dailyMileage.license_plate?.trim();
    if (directPlate) {
      return directPlate;
    }

    const fueling = this.fuelings()
      .filter(f => f.daily_mileage_id === dailyMileage.id && (f.license_plate || '').trim())
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];

    return fueling?.license_plate?.trim() || '-';
  }

  getKilometersDriven(dailyMileage: DailyMileage): number {
    if (!dailyMileage.end_kilometers) return 0;
    return dailyMileage.end_kilometers - dailyMileage.start_kilometers;
  }

  openEditDailyMileage(mileage: DailyMileage) {
    const user = this.currentUser();
    if (!user) return;

    if (user.role === 'professional' && mileage.professional_id !== user.id) {
      alert('Você só pode editar suas próprias quilometragens.');
      return;
    }

    this.editingDailyMileage.set(mileage);
    this.editLicensePlate.set(mileage.license_plate?.trim() || '');
    this.editStartKilometers.set(mileage.start_kilometers);
    this.editEndKilometers.set(mileage.end_kilometers ?? null);
  }

  closeEditDailyMileage() {
    this.editingDailyMileage.set(null);
    this.editLicensePlate.set('');
    this.editStartKilometers.set(null);
    this.editEndKilometers.set(null);
  }

  async saveEditedDailyMileage() {
    const user = this.currentUser();
    if (!user) return;

    const mileage = this.editingDailyMileage();
    if (!mileage) return;

    if (user.role === 'professional' && mileage.professional_id !== user.id) {
      alert('Você só pode editar suas próprias quilometragens.');
      return;
    }

    const startKm = this.editStartKilometers();
    if (startKm === null || Number.isNaN(Number(startKm)) || startKm < 0) {
      alert('Por favor, insira uma quilometragem inicial válida.');
      return;
    }

    const endKm = this.editEndKilometers();
    if (endKm !== null && (Number.isNaN(Number(endKm)) || endKm < startKm)) {
      alert('A quilometragem final deve ser maior ou igual à inicial.');
      return;
    }

    const plate = this.editLicensePlate().trim();

    const updates: Partial<DailyMileage> = {
      start_kilometers: startKm,
      end_kilometers: endKm ?? undefined,
      license_plate: null,
    };

    if (plate) {
      updates.license_plate = plate;
    }

    await this.dailyMileageService.updateDailyMileage(mileage.id, updates);

    this.closeEditDailyMileage();
    await this.loadData();
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
      case 'licensePlate':
        this.filterLicensePlate.set('');
        break;
      case 'professional':
        this.filterProfessionalId.set(null);
        break;
    }
  }

  clearFilters() {
    this.filterStartDate.set('');
    this.filterEndDate.set('');
    this.filterMinDriven.set(null);
    this.filterMaxDriven.set(null);
    this.filterMinFueling.set(null);
    this.filterMaxFueling.set(null);
    this.filterLicensePlate.set('');
    this.filterProfessionalId.set(null);
    this.currentPage.set(1);
  }

  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  sortByColumn(column: 'date' | 'driven' | 'fueling' | 'professional' | 'licensePlate' | 'initial' | 'final' | 'kilometers') {
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

  // Pagination helpers
  Math = Math;
  get pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    pages.push(1);
    let start = Math.max(2, current - 2);
    let end = Math.min(total - 1, current + 2);
    if (start > 2) pages.push(-1);
    for (let i = start; i <= end; i++) if (i !== 1 && i !== total) pages.push(i);
    if (end < total - 1) pages.push(-1);
    if (total > 1) pages.push(total);
    return pages;
  }

  setItemsPerPage(items: number) { 
    this.itemsPerPage.set(items); 
    this.currentPage.set(1); 
  }

  // Gerar relatório PDF com os filtros aplicados
  async generatePDFReport() {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const autoTable: any =
      (autoTableModule as any).default ?? (autoTableModule as any).autoTable;

    // Configurações da página
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Função auxiliar para adicionar texto com quebra de linha
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      doc.text(text, x, y, options);
      return y + 7; // Altura aproximada da linha
    };

    // Header - Logotipo
    try {
      // Tentar carregar o logotipo como base64
      const response = await fetch('assets/logo-new.png');
      const blob = await response.blob();
      const reader = new FileReader();
      await new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const logoData = reader.result as string;
      doc.addImage(logoData, 'PNG', margin, yPosition, 50, 20);
      yPosition += 25;
    } catch (error) {
      console.warn('Erro ao carregar logotipo:', error);
      yPosition += 10;
    }

    // Título do relatório
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    yPosition = addText('Relatório de Quilometragem Diária', pageWidth / 2, yPosition, { align: 'center' });

    // Nome do usuário
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    yPosition = addText(`Emitido por: ${this.currentUser()?.name || 'Usuário'}`, pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 10;

    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Filtros aplicados
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    yPosition = addText('Filtros Aplicados:', margin, yPosition);

    doc.setFont('helvetica', 'normal');
    if (this.filterStartDate()) {
      yPosition = addText(`Data Inicial: ${this.formatDate(this.filterStartDate())}`, margin + 10, yPosition);
    }
    if (this.filterEndDate()) {
      yPosition = addText(`Data Final: ${this.formatDate(this.filterEndDate())}`, margin + 10, yPosition);
    }
    if (this.filterMinDriven() !== null) {
      yPosition = addText(`Quilometragem Mínima: ${this.filterMinDriven()} km`, margin + 10, yPosition);
    }
    if (this.filterMaxDriven() !== null) {
      yPosition = addText(`Quilometragem Máxima: ${this.filterMaxDriven()} km`, margin + 10, yPosition);
    }
    if (this.filterMinFueling() !== null) {
      yPosition = addText(`Abastecimento Mínimo: €${this.filterMinFueling()}`, margin + 10, yPosition);
    }
    if (this.filterMaxFueling() !== null) {
      yPosition = addText(`Abastecimento Máximo: €${this.filterMaxFueling()}`, margin + 10, yPosition);
    }
    if (this.filterLicensePlate().trim()) {
      yPosition = addText(`Matrícula: ${this.filterLicensePlate()}`, margin + 10, yPosition);
    }
    if (this.filterProfessionalId() !== null) {
      const professional = this.professionals().find(p => p.id === this.filterProfessionalId());
      yPosition = addText(`Profissional: ${professional?.name || 'N/A'}`, margin + 10, yPosition);
    }

    yPosition += 10;

    // Tabela de dados
    const tableData = this.filteredMileages().map(mileage => {
      const professional = this.professionals().find(p => p.id === mileage.professional_id);
      const kilometersDriven = this.getKilometersDriven(mileage);
      const totalFueling = this.getTotalFueling(mileage);

      return [
        this.formatDate(mileage.date),
        this.isAdmin() ? (professional?.name || 'N/A') : '',
        this.getLicensePlateForMileage(mileage),
        mileage.start_kilometers.toString(),
        mileage.end_kilometers?.toString() || '',
        kilometersDriven.toString(),
        `€${totalFueling.toFixed(2)}`
      ];
    });

    // Adicionar linha de totais
    if (tableData.length > 0) {
      tableData.push([
        'TOTAL',
        '',
        '',
        '',
        '',
        this.totalDriven().toString(),
        `€${this.totalFueling().toFixed(2)}`
      ]);
    }

    // Configurar colunas baseado no papel do usuário
    const head = this.isAdmin()
      ? [['Data', 'Profissional', 'Matrícula', 'Inicial', 'Final', 'Quilometragem', 'Abastecimento']]
      : [['Data', 'Matrícula', 'Inicial', 'Final', 'Quilometragem', 'Abastecimento']];

    // Configurar autoTable
    autoTable(doc, {
      startY: yPosition,
      head: head,
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185], // Cor azul
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 10 },
      didDrawPage: (data: any) => {
        // Rodapé
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-PT')}`, margin, pageHeight - 10);
      }
    });

    // Salvar o PDF
    const fileName = `relatorio-quilometragem-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT');
  }
}