import { Component, ChangeDetectionStrategy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { I18nService } from "../../i18n.service";
import { ServiceCategory } from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { signal, computed } from "@angular/core";

@Component({
  selector: "app-category-management",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./category-management.component.html",
  styleUrls: ["./category-management.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryManagementComponent {
  private dataService = inject(DataService);
  private i18n = inject(I18nService);

  newCategory = signal("");
  editingCategory = signal<ServiceCategory | null>(null);
  editingCategoryName = signal("");

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
}
