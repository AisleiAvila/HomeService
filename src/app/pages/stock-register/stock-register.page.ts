import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { StockIntakeFormComponent } from "../../../components/admin-dashboard/stock-intake/stock-intake-form.component";
import { StockItem } from "../../../models/maintenance.models";
import { I18nPipe } from "../../../pipes/i18n.pipe";

@Component({
  selector: "app-stock-register-page",
  standalone: true,
  imports: [CommonModule, RouterModule, I18nPipe, StockIntakeFormComponent],
  template: `
    <div class="w-full mobile-safe relative">
      <!-- Formulário Editar Item do Estoque -->
      <form class="w-full mobile-safe relative">
        <!-- Card Container -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-brand-primary-500 to-brand-primary-600">
            <div>
              <h2 class="text-2xl font-bold text-white flex items-center">
                <i class="fas fa-edit mr-3"></i>
                {{ editItem() ? ('editStockItem' | i18n) : ('registerMaterial' | i18n) }}
              </h2>
              <p class="text-brand-primary-200 text-sm mt-1">
                {{ editItem() ? ('fillFormToEditStockItem' | i18n) : ('fillFormToRegisterMaterial' | i18n) }}
              </p>
            </div>
          </div>
          <!-- Content -->
          <div class="p-6 bg-white dark:bg-gray-800">
            <app-stock-intake-form [editItem]="editItem()" />
          </div>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockRegisterPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  editItem = signal<StockItem | null>(null);

  backLink = computed(() => {
    return this.router.url.startsWith('/admin')
      ? ['/admin/stock-intake']
      : ['/stock/intake'];
  });

  constructor() {
    // Verifica se há parâmetro de edição na rota
    const itemParam = this.route.snapshot.queryParams['editItem'];
    if (itemParam) {
      try {
        this.editItem.set(JSON.parse(itemParam));
      } catch (error) {
        console.error('Erro ao parsear item de edição:', error);
      }
    }
  }
}
