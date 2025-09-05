import { Component, ChangeDetectionStrategy, input, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User, ServiceCategory } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  user = input.required<User>();
  
  dataService = inject(DataService);
  notificationService = inject(NotificationService);
  categories = this.dataService.categories;

  editableName = signal('');
  editableSpecialties = signal<ServiceCategory[]>([]);

  constructor() {
    effect(() => {
      // When the user input changes, reset the editable fields
      const currentUser = this.user();
      this.editableName.set(currentUser.name);
      this.editableSpecialties.set(currentUser.specialties ? [...currentUser.specialties] : []);
    });
  }

  hasChanges = computed(() => {
    const currentUser = this.user();
    const nameChanged = this.editableName() !== currentUser.name;
    const specialtiesChanged = JSON.stringify(this.editableSpecialties().sort()) !== JSON.stringify(currentUser.specialties?.sort() ?? []);
    return nameChanged || specialtiesChanged;
  });

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
          this.notificationService.addNotification('Error: Please select a valid image file (PNG, JPG, GIF).');
          return;
      }

      // Validate file size (e.g., 2MB limit)
      if (file.size > 2 * 1024 * 1024) {
          this.notificationService.addNotification('Error: File is too large. Maximum size is 2MB.');
          return;
      }
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64String = e.target.result;
        this.dataService.updateUser(this.user().id, { avatarUrl: base64String });
        this.notificationService.addNotification('Profile picture updated successfully.');
      };
      reader.readAsDataURL(file);
    }
  }

  onSpecialtyChange(category: ServiceCategory, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.editableSpecialties.update(current => {
      if (isChecked) {
        return [...current, category];
      } else {
        return current.filter(c => c !== category);
      }
    });
  }

  isChecked(category: ServiceCategory): boolean {
    return this.editableSpecialties().includes(category);
  }

  saveChanges() {
    if (this.user().role === 'professional' && this.editableSpecialties().length === 0) {
      this.notificationService.addNotification('Erro: Um profissional deve ter pelo menos uma especialidade.');
      return;
    }

    if (this.hasChanges()) {
      const updates: Partial<Pick<User, 'name' | 'specialties'>> = {};
      const currentUser = this.user();
      if (this.editableName() !== currentUser.name) {
        updates.name = this.editableName();
      }
      if (JSON.stringify(this.editableSpecialties().sort()) !== JSON.stringify(currentUser.specialties?.sort() ?? [])) {
        updates.specialties = this.editableSpecialties();
      }
      this.dataService.updateUser(currentUser.id, updates);
    }
  }

  cancelChanges() {
    const currentUser = this.user();
    this.editableName.set(currentUser.name);
    this.editableSpecialties.set(currentUser.specialties ? [...currentUser.specialties] : []);
  }
}