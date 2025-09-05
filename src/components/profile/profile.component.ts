import { Component, ChangeDetectionStrategy, input, signal, inject, effect, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User, ServiceCategory } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { I18nService } from '../../services/i18n.service';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  user = input.required<User>();
  
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);
  private i18n = inject(I18nService);

  allCategories = this.dataService.categories;

  // Form state signals
  name = signal('');
  email = signal('');
  specialties = signal<ServiceCategory[]>([]);
  isChanged = signal(false);

  // Signals and ViewChild for camera functionality
  videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');
  showCameraModal = signal(false);
  private videoStream = signal<MediaStream | null>(null);

  constructor() {
    // When user input changes, reset the form state
    effect(() => {
      this.resetForm();
    }, { allowSignalWrites: true });

    // Effect to manage the camera stream based on the modal's visibility
    effect(() => {
      const videoEl = this.videoElement()?.nativeElement;
      if (this.showCameraModal() && videoEl) {
        this.startCameraStream(videoEl);
      } else {
        // Cleanup: Stop the stream when the modal is closed or component is destroyed
        this.stopCameraStream();
      }
    });
  }

  resetForm(): void {
    const currentUser = this.user();
    this.name.set(currentUser.name);
    this.email.set(currentUser.email);
    this.specialties.set(currentUser.specialties ? [...currentUser.specialties] : []);
    this.isChanged.set(false);
  }

  onSpecialtyChange(category: ServiceCategory, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.specialties.update(current => {
      if (isChecked) {
        return [...current, category];
      } else {
        return current.filter(c => c !== category);
      }
    });
    this.checkIfChanged();
  }

  isSpecialtyChecked(category: ServiceCategory): boolean {
    return this.specialties().includes(category);
  }

  checkIfChanged(): void {
    const currentUser = this.user();
    const nameChanged = this.name() !== currentUser.name;
    const emailChanged = this.email() !== currentUser.email;
    
    let specialtiesChanged = false;
    if (currentUser.role === 'professional') {
        const currentSpecialties = currentUser.specialties?.sort() ?? [];
        const newSpecialties = this.specialties().sort();
        specialtiesChanged = JSON.stringify(newSpecialties) !== JSON.stringify(currentSpecialties);
    }
    
    this.isChanged.set(nameChanged || emailChanged || specialtiesChanged);
  }

  saveProfile(): void {
    if (!this.isChanged()) {
      this.notificationService.addNotification(this.i18n.translate('noChangesDetected'));
      return;
    }
    
    const currentUser = this.user();
    const updates: Partial<Pick<User, 'name' | 'email' | 'specialties'>> = {};

    const newName = this.name().trim();
    if (newName && newName !== currentUser.name) updates.name = newName;

    const newEmail = this.email().trim();
    if (newEmail && newEmail !== currentUser.email) updates.email = newEmail;

    if (currentUser.role === 'professional') {
      const currentSpecialties = currentUser.specialties?.sort() ?? [];
      const newSpecialties = this.specialties().sort();
      const specialtiesChanged = JSON.stringify(newSpecialties) !== JSON.stringify(currentSpecialties);
      if(specialtiesChanged) updates.specialties = this.specialties();
    }
    
    if (Object.keys(updates).length > 0) {
      this.dataService.updateUser(currentUser.id, updates);
    } else {
      this.notificationService.addNotification(this.i18n.translate('noChangesDetected'));
      this.isChanged.set(false);
    }
  }

  // --- Avatar Update Methods ---

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      this.notificationService.addNotification(this.i18n.translate('errorInvalidFileFormat'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      this.notificationService.addNotification(this.i18n.translate('errorImageTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const avatarUrl = reader.result as string;
      this.dataService.updateUser(this.user().id, { avatarUrl });
    };
    reader.readAsDataURL(file);
  }

  async openCameraModal() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.notificationService.addNotification(this.i18n.translate('errorCameraNotSupported'));
      return;
    }
    this.showCameraModal.set(true);
  }

  private async startCameraStream(videoEl: HTMLVideoElement) {
    if (this.videoStream()) return; // Already streaming

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoStream.set(stream);
      videoEl.srcObject = stream;
      videoEl.play(); // Explicitly play the video
    } catch (err) {
      console.error("Error accessing camera: ", err);
      this.notificationService.addNotification(this.i18n.translate('errorAccessingCamera'));
      this.closeCameraModal();
    }
  }
  
  private stopCameraStream() {
    this.videoStream()?.getTracks().forEach(track => track.stop());
    this.videoStream.set(null);
  }

  closeCameraModal() {
    this.showCameraModal.set(false);
  }

  capturePhoto() {
    const videoEl = this.videoElement()?.nativeElement;
    if (!videoEl || videoEl.paused || videoEl.ended) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const context = canvas.getContext('2d');
    context?.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    const avatarUrl = canvas.toDataURL('image/jpeg');
    this.dataService.updateUser(this.user().id, { avatarUrl });
    this.closeCameraModal();
  }
}