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
  private dailyMileageService = inject(DailyMileageService);
  private authService = inject(AuthService);
  private i18n = inject(I18nService);

  // Current user
  currentUser = this.authService.appUser;

  // Form states
  showStartForm = signal(false);
  showEndForm = signal(false);
  selectedDailyMileage = signal<DailyMileage | null>(null);

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

  // Computed
  dailyMileages = computed(() => this.dailyMileageService.dailyMileages());
  fuelings = computed(() => this.dailyMileageService.fuelings());
  todayMileage = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.dailyMileages().find(dm => dm.date === today);
  });

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (user && user.role === 'professional') {
        this.loadData();
      }
    });
  }

  ngOnInit() {
    this.loadData();
  }

  // Helper methods for number conversion
  onStartKilometersChange(value: string) {
    this.startKilometers.set(Number(value) || null);
  }

  onEndKilometersChange(value: string) {
    this.endKilometers.set(Number(value) || null);
  }

  onFuelingValueChange(value: string) {
    this.fuelingValue.set(Number(value) || null);
  }

  async loadData() {
    const user = this.currentUser();
    if (user) {
      await this.dailyMileageService.loadDailyMileages(user.id);
      // Carregar fuelings para todos os mileages para exibir totais corretos
      const mileages = this.dailyMileageService.dailyMileages();
      await Promise.all(mileages.map(m => this.dailyMileageService.loadFuelings(m.id)));
    }
  }

  async startDay() {
    const startKm = Number(this.startKilometers());
    if (isNaN(startKm) || startKm < 0 || this.startKilometers() === null || this.startKilometers() === undefined) {
      alert('Por favor, insira uma quilometragem inicial válida.');
      return;
    }

    const user = this.currentUser();
    if (!user) return;

    const dailyMileage = await this.dailyMileageService.createDailyMileage({
      professional_id: user.id,
      date: this.startDate(),
      start_kilometers: startKm,
    });

    if (dailyMileage) {
      this.showStartForm.set(false);
      this.startKilometers.set(null);
    }
  }

  async endDay() {
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
  }

  async addFueling() {
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
      receiptUrl = await this.dailyMileageService.uploadReceiptImage(this.fuelingReceiptFile()!);
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

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.fuelingReceiptFile.set(input.files[0]);
    }
  }

  viewFuelings(dailyMileage: DailyMileage) {
    this.selectedDailyMileage.set(dailyMileage);
    this.dailyMileageService.loadFuelings(dailyMileage.id);
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
}