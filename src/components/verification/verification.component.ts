import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './verification.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationComponent {
  email = input.required<string>();
  verified = output<string>();
  resendCode = output<void>();

  verificationCode = signal('');

  verify() {
    if (this.verificationCode()) {
      // In a real app, verify the code. Here we just assume it's correct.
      this.verified.emit(this.verificationCode());
    }
  }
}