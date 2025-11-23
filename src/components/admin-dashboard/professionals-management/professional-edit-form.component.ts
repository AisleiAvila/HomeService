import { CommonModule } from "@angular/common";
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ServiceCategory } from "../../../models/maintenance.models";
import { I18nPipe } from "../../../pipes/i18n.pipe";

@Component({
  selector: "app-professional-edit-form",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./professional-edit-form.component.html",
})
export class ProfessionalEditFormComponent {
  @Input() allCategories: ServiceCategory[] = [];
  @Input() name = "";
  @Input() email = "";
  @Input() specialties: ServiceCategory[] = [];
  @Input() nameError: string | null = null;
  @Input() emailError: string | null = null;
  @Input() specialtiesError: string | null = null;
  @Input() feedbackMessage: string | null = null;
  @Input() feedbackType: 'success' | 'error' | 'info' = 'info';
  @Output() nameChange = new EventEmitter<string>();
  @Output() emailChange = new EventEmitter<string>();
  @Output() specialtiesChange = new EventEmitter<ServiceCategory[]>();
  @Output() update = new EventEmitter<void>();
  @Output() cancelEdit = new EventEmitter<void>();

  onSpecialtyToggle(category: ServiceCategory, event: any) {
    const checked = event.target.checked;
    let updated = [...this.specialties];
    if (checked) {
      updated.push(category);
    } else {
      updated = updated.filter((c) => c.id !== category.id);
    }
    this.specialtiesChange.emit(updated);
  }

  validateAndUpdate() {
    let valid = true;
    if (!this.name || this.name.trim().length < 3) {
      this.nameError = 'nameRequired';
      valid = false;
    } else {
      this.nameError = null;
    }
    if (!this.email || !/^\S+@\S+\.\S+$/.test(this.email)) {
      this.emailError = 'emailInvalid';
      valid = false;
    } else {
      this.emailError = null;
    }
    if (!this.specialties || this.specialties.length === 0) {
      this.specialtiesError = 'specialtyRequired';
      valid = false;
    } else {
      this.specialtiesError = null;
    }
    if (valid) {
      this.update.emit();
    }
  }
}
