import { ChangeDetectionStrategy, Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { StockIntakeFormComponent } from "../../../components/admin-dashboard/stock-intake/stock-intake-form.component";

@Component({
  selector: "app-stock-register-page",
  standalone: true,
  imports: [CommonModule, RouterModule, I18nPipe, StockIntakeFormComponent],
  template: `
    <div class="container mx-auto max-w-3xl p-4">
      <div class="flex items-center justify-between gap-3 mb-4">
        <h1 class="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <i class="fa-solid fa-box"></i>
          {{ 'registerMaterial' | i18n }}
        </h1>

        <a
          routerLink="/admin/stock-intake"
          class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <i class="fa-solid fa-arrow-left"></i>
          <span>{{ 'back' | i18n }}</span>
        </a>
      </div>

      <app-stock-intake-form />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockRegisterPage {}
