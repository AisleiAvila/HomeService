import { CommonModule } from "@angular/common";
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ServiceCategory } from "../../../models/maintenance.models";
import { I18nPipe } from "../../../pipes/i18n.pipe";

@Component({
  selector: "app-professional-form",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./professional-form.component.html",
})
export class ProfessionalFormComponent {
  @Input() allCategories: ServiceCategory[] = [];
  @Input() name = "";
  @Input() email = "";
  @Input() specialties: ServiceCategory[] = [];
  @Input() phone = "";
  phoneError: string | null = null;
  @Output() phoneChange = new EventEmitter<string>();
  nameError: string | null = null;
  emailError: string | null = null;
  specialtiesError: string | null = null;
  @Input() feedbackMessage: string | null = null;
  @Input() feedbackType: 'success' | 'error' | 'info' = 'info';
  @Output() nameChange = new EventEmitter<string>();
  @Output() emailChange = new EventEmitter<string>();
  @Output() specialtiesChange = new EventEmitter<ServiceCategory[]>();
  @Output() add = new EventEmitter<void>();
  @Output() cancelAdd = new EventEmitter<void>();

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

  validateAndAdd() {
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
    // Validação telefone Portugal: 9 dígitos, pode aceitar 999999999 ou 99999-9999
    if (!this.phone || !/^(9\d{8}|9\d{4}-\d{4})$/.test(this.phone)) {
      this.phoneError = 'phoneInvalid';
      valid = false;
    } else {
      this.phoneError = null;
    }
    if (!this.specialties || this.specialties.length === 0) {
      this.specialtiesError = 'specialtyRequired';
      valid = false;
    } else {
      this.specialtiesError = null;
    }
    if (valid) {
      this.add.emit();
    }
  }
}
