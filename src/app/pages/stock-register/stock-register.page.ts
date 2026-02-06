import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";
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
        <div class="bg-linear-to-r from-brand-primary-600 to-brand-primary-500 rounded-lg shadow-md overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-white border-opacity-20">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-2xl font-bold text-white flex items-center">
                  <i class="fas fa-edit mr-3"></i>
                  {{ editItem() ? ('editStockItem' | i18n) : ('registerMaterial' | i18n) }}
                </h2>
                <p class="text-white text-sm mt-1">
                  {{ editItem() ? ('fillFormToEditStockItem' | i18n) : ('fillFormToRegisterMaterial' | i18n) }}
                </p>
              </div>
              <a
                routerLink="/admin/stock-intake"
                class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-white border-opacity-30 text-white text-sm font-semibold hover:bg-white hover:bg-opacity-10 transition-all"
              >
                <i class="fa-solid fa-arrow-left"></i>
                <span>{{ 'back' | i18n }}</span>
              </a>
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
  editItem = signal<StockItem | null>(null);

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
