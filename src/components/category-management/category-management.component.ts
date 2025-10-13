import { Component, ChangeDetectionStrategy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { I18nService } from "../../i18n.service";
import { ServiceCategory } from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { signal, computed } from "@angular/core";

import { ServiceSubcategory } from "../../models/maintenance.models";

@Component({
  selector: "app-category-management",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./category-management.component.html",
  styleUrls: ["./category-management.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryManagementComponent {
  newCategory = signal("");
  private dataService = inject(DataService);
  // Signals para gerenciamento de subcategorias
  // Consolidado: signals e métodos para subcategorias
  selectedCategoryForSubcategories = signal<ServiceCategory | null>(null);
  // Removidas duplicidades: signals já declarados acima

  // Mantido apenas uma versão de allSubcategories
  subcategoriesForSelectedCategory = computed(() => {
    const cat = this.selectedCategoryForSubcategories();
    if (!cat) return [];
    return this.allSubcategories().filter((sub) => sub.category_id === cat.id);
  });

  manageSubcategories(category: ServiceCategory) {
    this.selectedCategoryForSubcategories.set(category);
    this.newSubcategoryName.set("");
    this.editingSubcategory.set(null);
    this.showDeleteSubcategoryModal.set(false);
    this.subcategoryToDelete.set(null);
  }

  async addSubcategoryToCategory() {
    const cat = this.selectedCategoryForSubcategories();
    const name = this.newSubcategoryName().trim();
    if (!cat || !name) return;
    if (
      this.subcategoriesForSelectedCategory().some((sub) => sub.name === name)
    )
      return;
    await this.dataService.addSubcategory(name, cat.id);
    this.newSubcategoryName.set("");
  }

  // Removida duplicidade: método já declarado acima

  // Removida duplicidade: método já declarado acima

  // Removida duplicidade: método já declarado acima

  // Removida duplicidade: método já declarado acima

  // Removida duplicidade: método já declarado acima

  // Mantido apenas uma versão de trackBySubId
  editingCategory = signal<ServiceCategory | null>(null);
  editingCategoryName = signal("");

  // Signal para modal de inclusão de categoria
  showAddCategoryModal = signal(false);

  allCategories = computed(() => this.dataService.categories());

  categoryExists(name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed) return false;
    return this.allCategories().some((cat) => cat.name === trimmed);
  }

  addCategory() {
    const catName = this.newCategory().trim();
    if (catName && !this.allCategories().some((cat) => cat.name === catName)) {
      this.dataService.addCategory(catName);
      this.newCategory.set("");
      this.showAddCategoryModal.set(false);
    }
  }

  startEditCategory(category: ServiceCategory) {
    this.editingCategory.set(category);
    this.editingCategoryName.set(category.name);
  }

  saveCategoryEdit() {
    const oldCategory = this.editingCategory();
    const newName = this.editingCategoryName().trim();
    if (!oldCategory || !newName || newName === oldCategory.name) {
      this.editingCategory.set(null);
      return;
    }
    if (this.allCategories().some((cat) => cat.name === newName)) {
      // Show error (could use a notification service)
      return;
    }
    this.dataService.updateCategory(oldCategory.id, newName);
    this.editingCategory.set(null);
    this.editingCategoryName.set("");
  }

  // Signal para modal de confirmação global
  showDeleteModal = signal(false);
  categoryToDelete = signal<ServiceCategory | null>(null);

  requestDeleteCategory(category: ServiceCategory) {
    this.categoryToDelete.set(category);
    this.showDeleteModal.set(true);
    // O app.component deve exibir o modal global quando showDeleteModal for true
    // e categoryToDelete estiver definido
  }

  confirmDeleteCategory() {
    const category = this.categoryToDelete();
    if (category) {
      this.dataService.deleteCategory(category.id);
    }
    this.showDeleteModal.set(false);
    this.categoryToDelete.set(null);
  }

  cancelDeleteCategory() {
    this.showDeleteModal.set(false);
    this.categoryToDelete.set(null);
  }

  trackById(index: number, item: ServiceCategory) {
    return item.id;
  }

  // Subcategory signals and logic
  selectedCategoryForSubcategory = signal<string>("");
  newSubcategoryName = signal("");

  allSubcategories = computed(() => this.dataService.subcategories());

  subcategoriesByCategory = (categoryId: number): ServiceSubcategory[] => {
    return this.allSubcategories().filter(
      (sub) => sub.category_id === categoryId
    );
  };

  subcategoryExists(name: string, categoryId: string | number): boolean {
    const trimmed = name.trim();
    if (!trimmed || !categoryId) return false;
    return this.allSubcategories().some(
      (sub) => sub.name === trimmed && sub.category_id === Number(categoryId)
    );
  }

  async addSubcategory() {
    const name = this.newSubcategoryName().trim();
    const categoryId = Number(this.selectedCategoryForSubcategory());
    if (!name || !categoryId || this.subcategoryExists(name, categoryId))
      return;
    await this.dataService.addSubcategory(name, categoryId);
    this.newSubcategoryName.set("");
  }

  // Edit subcategory
  editingSubcategory = signal<ServiceSubcategory | null>(null);
  editingSubcategoryName = signal("");

  startEditSubcategory(subcategory: ServiceSubcategory) {
    this.editingSubcategory.set(subcategory);
    this.editingSubcategoryName.set(subcategory.name);
  }

  async saveSubcategoryEdit() {
    const sub = this.editingSubcategory();
    const newName = this.editingSubcategoryName().trim();
    if (!sub || !newName || newName === sub.name) {
      this.editingSubcategory.set(null);
      return;
    }
    if (this.subcategoryExists(newName, sub.category_id)) {
      // Show error (could use notification)
      return;
    }
    await this.dataService.updateSubcategory(sub.id, newName);
    this.editingSubcategory.set(null);
    this.editingSubcategoryName.set("");
  }

  // Delete subcategory modal
  showDeleteSubcategoryModal = signal(false);
  subcategoryToDelete = signal<ServiceSubcategory | null>(null);

  requestDeleteSubcategory(subcategory: ServiceSubcategory) {
    this.subcategoryToDelete.set(subcategory);
    this.showDeleteSubcategoryModal.set(true);
  }

  async confirmDeleteSubcategory() {
    const sub = this.subcategoryToDelete();
    if (sub) {
      await this.dataService.deleteSubcategory(sub.id);
    }
    this.showDeleteSubcategoryModal.set(false);
    this.subcategoryToDelete.set(null);
  }

  cancelDeleteSubcategory() {
    this.showDeleteSubcategoryModal.set(false);
    this.subcategoryToDelete.set(null);
  }

  trackBySubId(index: number, item: ServiceSubcategory) {
    return item.id;
  }

  // Fechar modal de inclusão de categoria
  closeAddCategoryModal() {
    this.showAddCategoryModal.set(false);
    this.newCategory.set("");
  }
}
