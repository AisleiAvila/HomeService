import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex items-center justify-center min-h-full p-4 text-center">
      <div class="w-full max-w-md space-y-8">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verificação de conta
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Enviamos um código de verificação para {{ email() }}.
          </p>
        </div>
        <form class="mt-8 space-y-6" #verifyForm="ngForm" (ngSubmit)="verify()">
          <div>
            <label for="verification-code" class="sr-only">Código de verificação</label>
            <input id="verification-code" name="code" type="text" required
                   class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   placeholder="Código de verificação"
                   [ngModel]="verificationCode()" (ngModelChange)="verificationCode.set($event)">
          </div>

          <div>
            <button type="submit" [disabled]="!verifyForm.valid"
                    class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed">
              Verificar
            </button>
          </div>
        </form>
         <div class="text-sm text-center">
            <a href="#" (click)="$event.preventDefault(); resendCode.emit()" class="font-medium text-indigo-600 hover:text-indigo-500">
              Reenviar código
            </a>
          </div>
      </div>
    </div>
  `,
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
