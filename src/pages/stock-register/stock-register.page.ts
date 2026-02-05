import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StockIntakeFormComponent } from '../../components/admin-dashboard/stock-intake/stock-intake-form.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-stock-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule, StockIntakeFormComponent, I18nPipe],
  template: `
    <div class="container mx-auto max-w-2xl p-4">
      <h1 class="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 flex items-center gap-2">
        <i class="fa-solid fa-box"></i>
        {{ 'registerMaterial' | i18n }}
      </h1>
      <app-stock-intake-form />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockRegisterPage {}
