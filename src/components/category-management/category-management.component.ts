import { Component, ChangeDetectionStrategy, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { I18nService } from "../../i18n.service";
import { 
  ServiceCategory, 
  ServiceSubcategory,
  ServiceSubcategoryExtended 
} from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";

@Component({
  selector: "app-category-management",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./category-management.component.html",
  styleUrls: ["./category-management.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryManagementComponent {
  // ========== INJEÇÃO DE SERVIÇOS ==========
  private readonly dataService = inject(DataService);

  // ========== SIGNALS DE ESTADO - CATEGORIAS ==========
  newCategory = signal("");
  editingCategory = signal<ServiceCategory | null>(null);
  editingCategoryName = signal("");
  showAddCategoryModal = signal(false);
  showDeleteModal = signal(false);
  categoryToDelete = signal<ServiceCategory | null>(null);
  selectedCategoryForDetails = signal<ServiceCategory | null>(null);
  
  // ========== SIGNALS DE ESTADO - SUBCATEGORIAS (NOVA) ==========
  selectedCategoryForSubcategories = signal<ServiceCategory | null>(null);
  newSubcategoryName = signal("");
  newSubcategoryType = signal<"precificado" | "orçado" | "">("");
  newSubcategoryAverageTime = signal<number | null>(null);
  newSubcategoryPrice = signal<number | null>(null);
  newSubcategoryDescription = signal<string | null>(null);
  
  // ========== SIGNALS DE ESTADO - SUBCATEGORIAS (EDIÇÃO) ==========
  editingSubcategory = signal<ServiceSubcategoryExtended | null>(null);
  editingSubcategoryName = signal("");
  editingSubcategoryType = signal<"precificado" | "orçado" | "">("");
  editingSubcategoryAverageTime = signal<number | null>(null);
  editingSubcategoryPrice = signal<number | null>(null);
  editingSubcategoryDescription = signal<string | null>(null);
  
  // ========== SIGNALS DE ESTADO - SUBCATEGORIAS (OUTROS) ==========
  showDeleteSubcategoryModal = signal(false);
  subcategoryToDelete = signal<ServiceSubcategoryExtended | null>(null);
  selectedSubcategoryForDetails = signal<ServiceSubcategoryExtended | null>(null);
  selectedCategoryForSubcategory = signal<string>("");
  
  // ========== CONTROLE DE EXPANSÃO ==========
  private expandedCategories = signal<Set<number>>(new Set());

  // ========== COMPUTED SIGNALS ==========
  allCategories = computed(() => this.dataService.categories());
  allSubcategories = computed(() => {
    const subs = this.dataService.subcategories();
    console.log('[CategoryManagement] allSubcategories computed:', subs.length, 'subcategories');
    return subs;
  });
  
  /**
   * Subcategorias da categoria selecionada para gestão
   */
  subcategoriesForSelectedCategory = computed(() => {
    const cat = this.selectedCategoryForSubcategories();
    if (!cat) return [];
    return this.allSubcategories().filter((sub) => sub.category_id === cat.id);
  });

  /**
   * Mapa de contagem de subcategorias por categoria (otimizado para lookup rápido)
   */
  subcategoryCounts = computed(() => {
    const map = new Map<number, number>();
    for (const sub of this.allSubcategories()) {
      map.set(sub.category_id, (map.get(sub.category_id) || 0) + 1);
    }
    return map;
  });

  // ========== MÉTODOS DE CATEGORIAS ==========
  
  /**
   * Verifica se uma categoria com o nome fornecido já existe
   */
  categoryExists(name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed) return false;
    return this.allCategories().some((cat) => cat.name === trimmed);
  }

  /**
   * Adiciona uma nova categoria
   */
  addCategory() {
    const catName = this.newCategory().trim();
    if (catName && !this.categoryExists(catName)) {
      this.dataService.addCategory(catName);
      this.newCategory.set("");
      this.showAddCategoryModal.set(false);
    }
  }

  /**
   * Fecha o modal de adição de categoria
   */
  closeAddCategoryModal() {
    this.showAddCategoryModal.set(false);
    this.newCategory.set("");
  }

  /**
   * Inicia a edição de uma categoria
   */
  startEditCategory(category: ServiceCategory) {
    this.editingCategory.set(category);
    this.editingCategoryName.set(category.name);
  }

  /**
   * Salva as alterações de uma categoria
   */
  saveCategoryEdit() {
    const oldCategory = this.editingCategory();
    const newName = this.editingCategoryName().trim();
    
    if (!oldCategory || !newName || newName === oldCategory.name) {
      this.editingCategory.set(null);
      return;
    }
    
    if (this.categoryExists(newName)) {
      // Categoria com esse nome já existe - poderia usar NotificationService aqui
      return;
    }
    
    this.dataService.updateCategory(oldCategory.id, newName);
    this.editingCategory.set(null);
    this.editingCategoryName.set("");
  }

  /**
   * Solicita a exclusão de uma categoria
   */
  requestDeleteCategory(category: ServiceCategory) {
    this.categoryToDelete.set(category);
    this.showDeleteModal.set(true);
  }

  /**
   * Confirma a exclusão de uma categoria
   */
  confirmDeleteCategory() {
    const category = this.categoryToDelete();
    if (category) {
      this.dataService.deleteCategory(category.id);
    }
    this.cancelDeleteCategory();
  }

  /**
   * Cancela a exclusão de uma categoria
   */
  cancelDeleteCategory() {
    this.showDeleteModal.set(false);
    this.categoryToDelete.set(null);
  }

  /**
   * Exibe os detalhes de uma categoria
   */
  showDetails(category: ServiceCategory) {
    this.selectedCategoryForDetails.set(category);
  }

  /**
   * Função de rastreamento para ngFor (otimização de performance)
   */
  trackById(index: number, item: ServiceCategory): number {
    return item.id;
  }

  // ========== MÉTODOS DE EXPANSÃO ==========
  
  /**
   * Alterna a expansão de uma categoria
   */
  toggleExpand(categoryId: number) {
    const current = new Set(this.expandedCategories());
    if (current.has(categoryId)) {
      current.delete(categoryId);
    } else {
      current.add(categoryId);
    }
    this.expandedCategories.set(current);
  }

  /**
   * Verifica se uma categoria está expandida
   */
  isExpanded(categoryId: number): boolean {
    return this.expandedCategories().has(categoryId);
  }

  /**
   * Obtém subcategorias de uma categoria específica
   */
  subcategoriesOf(categoryId: number): ServiceSubcategoryExtended[] {
    const allSubs = this.allSubcategories();
    const filtered = allSubs.filter((s) => s.category_id === categoryId);
    
    // Log de debug para diagnóstico
    if (filtered.length === 0 && allSubs.length > 0) {
      console.debug(`[CategoryManagement] No subcategories found for category ${categoryId}`, {
        totalSubcategories: allSubs.length,
        categoryIds: [...new Set(allSubs.map(s => s.category_id))],
        requestedCategoryId: categoryId,
        categoryIdType: typeof categoryId
      });
    }
    
    return filtered;
  }

  // ========== MÉTODOS DE SUBCATEGORIAS - GESTÃO ==========
  
  /**
   * Abre o modal de gestão de subcategorias para uma categoria
   */
  manageSubcategories(category: ServiceCategory) {
    this.selectedCategoryForSubcategories.set(category);
    this.newSubcategoryName.set("");
    this.newSubcategoryType.set("");
    this.newSubcategoryAverageTime.set(null);
    this.newSubcategoryPrice.set(null);
    this.newSubcategoryDescription.set(null);
    this.editingSubcategory.set(null);
    this.showDeleteSubcategoryModal.set(false);
    this.subcategoryToDelete.set(null);
  }

  /**
   * Verifica se uma subcategoria já existe
   */
  subcategoryExists(
    name: string,
    categoryId: string | number,
    excludeId?: number
  ): boolean {
    const trimmed = name.trim();
    if (!trimmed || !categoryId) return false;
    return this.allSubcategories().some(
      (sub) =>
        sub.id !== excludeId &&
        sub.name === trimmed &&
        sub.category_id === Number(categoryId)
    );
  }

  /**
   * Adiciona uma nova subcategoria à categoria selecionada
   */
  async addSubcategoryToCategory() {
    const cat = this.selectedCategoryForSubcategories();
    const name = this.newSubcategoryName().trim();
    
    if (!cat || !name) return;
    if (this.subcategoriesForSelectedCategory().some((sub) => sub.name === name)) {
      return;
    }
    
    const type = this.newSubcategoryType() || undefined;
    const options: Partial<ServiceSubcategoryExtended> = {
      type,
      description: this.newSubcategoryDescription(),
    };
    
    // Apenas adicionar preço e tempo se não for "orçado"
    if (type !== "orçado") {
      options.average_time_minutes = this.newSubcategoryAverageTime();
      options.price = this.newSubcategoryPrice();
    }
    
    await this.dataService.addSubcategory(name, cat.id, options);
    
    // Resetar campos
    this.newSubcategoryName.set("");
    this.newSubcategoryType.set("");
    this.newSubcategoryAverageTime.set(null);
    this.newSubcategoryPrice.set(null);
    this.newSubcategoryDescription.set(null);
  }

  /**
   * Adiciona uma subcategoria (método alternativo)
   */
  async addSubcategory() {
    const name = this.newSubcategoryName().trim();
    const categoryId = Number(this.selectedCategoryForSubcategory());
    
    if (!name || !categoryId || this.subcategoryExists(name, categoryId)) {
      return;
    }
    
    const type = this.newSubcategoryType() || undefined;
    const options: Partial<ServiceSubcategoryExtended> = {
      type,
      description: this.newSubcategoryDescription(),
    };
    
    if (type !== "orçado") {
      options.average_time_minutes = this.newSubcategoryAverageTime();
      options.price = this.newSubcategoryPrice();
    }
    
    await this.dataService.addSubcategory(name, categoryId, options);
    this.newSubcategoryName.set("");
  }

  /**
   * Callback para mudança de tipo de nova subcategoria
   */
  onNewSubcategoryTypeChange(value: string) {
    const v = (value as any) || "";
    this.newSubcategoryType.set(v as "precificado" | "orçado" | "");
    
    // Limpar campos não aplicáveis para tipo "orçado"
    if (v === "orçado") {
      this.newSubcategoryAverageTime.set(null);
      this.newSubcategoryPrice.set(null);
    }
  }

  // ========== MÉTODOS DE SUBCATEGORIAS - EDIÇÃO ==========
  
  /**
   * Inicia a edição de uma subcategoria
   */
  startEditSubcategory(subcategory: ServiceSubcategoryExtended) {
    this.editingSubcategory.set(subcategory);
    this.editingSubcategoryName.set(subcategory.name);
    this.editingSubcategoryType.set((subcategory.type as any) || "");
    this.editingSubcategoryAverageTime.set(subcategory.average_time_minutes ?? null);
    this.editingSubcategoryPrice.set(subcategory.price ?? null);
    this.editingSubcategoryDescription.set(subcategory.description ?? null);
  }

  /**
   * Salva as alterações de uma subcategoria
   */
  async saveSubcategoryEdit() {
    const sub = this.editingSubcategory();
    const newName = this.editingSubcategoryName().trim();
    
    if (!sub || !newName) {
      this.editingSubcategory.set(null);
      return;
    }
    
    // Verificar duplicatas se o nome mudou
    if (newName !== sub.name && this.subcategoryExists(newName, sub.category_id, sub.id)) {
      // Nome já existe - poderia usar NotificationService aqui
      return;
    }
    
    const type = this.editingSubcategoryType() || null;
    const updates: Partial<ServiceSubcategoryExtended> = {
      name: newName,
      type,
      description: this.editingSubcategoryDescription() ?? null,
    };
    
    // Gerenciar campos específicos por tipo
    if (type !== "orçado") {
      updates.average_time_minutes = this.editingSubcategoryAverageTime() ?? null;
      updates.price = this.editingSubcategoryPrice() ?? null;
    } else {
      // Limpar campos ao mudar para "orçado"
      updates.average_time_minutes = null;
      updates.price = null;
    }
    
    await this.dataService.updateSubcategory(sub.id, updates);
    this.editingSubcategory.set(null);
    this.editingSubcategoryName.set("");
  }

  /**
   * Callback para mudança de tipo de subcategoria em edição
   */
  onEditingSubcategoryTypeChange(value: string) {
    const v = (value as any) || "";
    this.editingSubcategoryType.set(v as "precificado" | "orçado" | "");
    
    if (v === "orçado") {
      this.editingSubcategoryAverageTime.set(null);
      this.editingSubcategoryPrice.set(null);
    }
  }

  // ========== MÉTODOS DE SUBCATEGORIAS - EXCLUSÃO ==========
  
  /**
   * Solicita a exclusão de uma subcategoria
   */
  requestDeleteSubcategory(subcategory: ServiceSubcategoryExtended) {
    this.subcategoryToDelete.set(subcategory);
    this.showDeleteSubcategoryModal.set(true);
  }

  /**
   * Confirma a exclusão de uma subcategoria
   */
  async confirmDeleteSubcategory() {
    const sub = this.subcategoryToDelete();
    if (sub) {
      await this.dataService.deleteSubcategory(sub.id);
    }
    this.cancelDeleteSubcategory();
  }

  /**
   * Cancela a exclusão de uma subcategoria
   */
  cancelDeleteSubcategory() {
    this.showDeleteSubcategoryModal.set(false);
    this.subcategoryToDelete.set(null);
  }

  // ========== MÉTODOS DE SUBCATEGORIAS - DETALHES ==========
  
  /**
   * Exibe os detalhes de uma subcategoria
   */
  showSubcategoryDetails(subcategory: ServiceSubcategoryExtended) {
    this.selectedSubcategoryForDetails.set(subcategory);
  }

  /**
   * Fecha o modal de detalhes de subcategoria
   */
  closeSubcategoryDetails() {
    this.selectedSubcategoryForDetails.set(null);
  }

  /**
   * Obtém o nome da categoria pelo ID
   */
  getCategoryName(categoryId: number): string {
    const category = this.allCategories().find(cat => cat.id === categoryId);
    return category?.name || 'N/A';
  }

  /**
   * Função de rastreamento para subcategorias no ngFor
   */
  trackBySubId(index: number, item: ServiceSubcategoryExtended): number {
    return item.id;
  }
}
