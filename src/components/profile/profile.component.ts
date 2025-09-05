
import { Component, ChangeDetectionStrategy, input, effect, signal, inject, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User, Address, ServiceCategory } from '../../models/maintenance.models';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { I18nService } from '../../services/i18n.service';
import { DataService } from '../../services/data.service';
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
  
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private dataService = inject(DataService);
  private i18n = inject(I18nService);

  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');
  
  // Form state signals
  name = signal('');
  phone = signal('');
  address = signal<Address>({ street: '', city: '', state: '', zip_code: '' });
  specialties = signal<ServiceCategory[]>([]);
  
  // UI state
  isEditing = signal(false);
  isCameraOpen = signal(false);
  
  allCategories = this.dataService.categories;
  private cameraStream: MediaStream | null = null;
  
  constructor() {
    effect(() => {
      const currentUser = this.user();
      if (currentUser) {
        this.name.set(currentUser.name);
        this.phone.set(currentUser.phone || '');
        this.address.set(currentUser.address || { street: '', city: '', state: '', zip_code: '' });
        this.specialties.set(currentUser.specialties || []);
      }
    });
  }

  toggleSpecialty(category: ServiceCategory) {
    this.specialties.update(current => 
      current.includes(category) 
        ? current.filter(c => c !== category) 
        : [...current, category]
    );
  }

  saveChanges() {
    const originalUser = this.user();
    const updatedUserData: Partial<User> = {};
    let hasChanges = false;
    
    if (this.name() !== originalUser.name) {
      updatedUserData.name = this.name();
      hasChanges = true;
    }
    if (this.phone() !== (originalUser.phone || '')) {
      updatedUserData.phone = this.phone();
      hasChanges = true;
    }
    if (JSON.stringify(this.address()) !== JSON.stringify(originalUser.address || {})) {
        updatedUserData.address = this.address();
        hasChanges = true;
    }
    if (this.user().role === 'professional' && JSON.stringify(this.specialties()) !== JSON.stringify(originalUser.specialties || [])) {
        updatedUserData.specialties = this.specialties();
        hasChanges = true;
    }

    if (hasChanges) {
      this.authService.updateUserProfile(updatedUserData);
      this.isEditing.set(false);
    } else {
      this.notificationService.addNotification(this.i18n.translate('noChangesDetected'));
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        this.notificationService.addNotification(this.i18n.translate('errorInvalidFileFormat'));
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        this.notificationService.addNotification(this.i18n.translate('errorImageTooLarge'));
        return;
      }
      await this.authService.uploadAvatar(file);
    }
  }
  
  async openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.notificationService.addNotification(this.i18n.translate('errorCameraNotSupported'));
      return;
    }
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (this.videoElement()) {
        this.videoElement()!.nativeElement.srcObject = this.cameraStream;
        this.isCameraOpen.set(true);
      }
    } catch (err) {
      this.notificationService.addNotification(this.i18n.translate('errorAccessingCamera'));
      console.error(err);
    }
  }

  capturePhoto() {
    const video = this.videoElement()?.nativeElement;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
        await this.authService.uploadAvatar(file);
      }
      this.closeCamera();
    }, 'image/jpeg');
  }

  closeCamera() {
    this.cameraStream?.getTracks().forEach(track => track.stop());
    this.isCameraOpen.set(false);
  }
}
