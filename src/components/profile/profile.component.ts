import { Component, ChangeDetectionStrategy, input, signal, inject, effect, computed } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User, ServiceCategory } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  user = input.required<User>();
  
  dataService = inject(DataService);
  categories = this.dataService.categories;

  editableName = signal('');
  editableSpecialty = signal<ServiceCategory | null | undefined>(null);

  constructor() {
    effect(() => {
      // When the user input changes, reset the editable fields
      const currentUser = this.user();
      this.editableName.set(currentUser.name);
      this.editableSpecialty.set(currentUser.specialty);
    });
  }

  hasChanges = computed(() => {
    const currentUser = this.user();
    return this.editableName() !== currentUser.name || this.editableSpecialty() !== currentUser.specialty;
  });

  saveChanges() {
    if (this.hasChanges()) {
      const updates: Partial<Pick<User, 'name' | 'specialty'>> = {};
      const currentUser = this.user();
      if (this.editableName() !== currentUser.name) {
        updates.name = this.editableName();
      }
      if (this.editableSpecialty() !== currentUser.specialty) {
        updates.specialty = this.editableSpecialty() ?? null;
      }
      this.dataService.updateUser(currentUser.id, updates);
    }
  }

  cancelChanges() {
    const currentUser = this.user();
    this.editableName.set(currentUser.name);
    this.editableSpecialty.set(currentUser.specialty);
  }
}
