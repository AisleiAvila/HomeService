import { Component, inject, OnInit } from '@angular/core';
import { I18nService } from '../../i18n.service';
import type { EmailOtpType } from '@supabase/gotrue-js';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 class="text-xl font-bold mb-4">{{ i18n.translate('setNewPassword') }}</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" *ngIf="!success">
        <div class="mb-4">
          <label class="block mb-1">{{ i18n.translate('newPassword') }}</label>
          <div class="relative">
            <input 
              [type]="showPassword ? 'text' : 'password'" 
              formControlName="password" 
              class="w-full border rounded px-3 py-2 pr-10" 
              [class.border-red-500]="form.get('password')?.touched && form.get('password')?.invalid"
            />
            <button type="button" (click)="togglePasswordVisibility()" class="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700">
              <svg *ngIf="!showPassword" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <svg *ngIf="showPassword" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            </button>
          </div>
          <div *ngIf="form.get('password')?.touched && form.get('password')?.errors?.['minlength']" class="text-red-500 text-sm mt-1">
            {{ i18n.translate('passwordTooShort') }}
          </div>
        </div>
        <div class="mb-4">
          <label class="block mb-1">{{ i18n.translate('confirmPassword') }}</label>
          <div class="relative">
            <input 
              [type]="showConfirmPassword ? 'text' : 'password'" 
              formControlName="confirmPassword" 
              class="w-full border rounded px-3 py-2 pr-10"
              [class.border-red-500]="form.errors?.['mismatch'] && (form.get('confirmPassword')?.touched || form.get('confirmPassword')?.dirty)"
            />
            <button type="button" (click)="toggleConfirmPasswordVisibility()" class="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700">
              <svg *ngIf="!showConfirmPassword" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <svg *ngIf="showConfirmPassword" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            </button>
          </div>
          <div *ngIf="form.errors?.['mismatch'] && (form.get('confirmPassword')?.touched || form.get('confirmPassword')?.dirty)" class="text-red-500 text-sm mt-1">
            {{ i18n.translate('passwordsDoNotMatch') }}
          </div>
        </div>
        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700 transition-colors" [disabled]="form.invalid || loading">
          {{ loading ? i18n.translate('updatingPassword') : i18n.translate('setNewPassword') }}
        </button>
        <div *ngIf="error" class="text-red-600 mt-2 text-center">{{ error }}</div>
      </form>
      <div *ngIf="success" class="text-green-700 font-semibold text-center">
        {{ i18n.translate('passwordSetSuccess') }}
      </div>
    </div>
  `
})
export class ConfirmEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly notification = inject(NotificationService);
  public readonly i18n = inject(I18nService);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  loading = false;
  error = '';
  success = false;
  showPassword = false;
  showConfirmPassword = false;

  ngOnInit() {
    // Check for existing session
    this.supabase.client.auth.getSession().then(({ data }) => {
      if (data?.session) {
        // User is already logged in
        console.log('User already logged in, ready to update password');
      }
    });
  }

  passwordMatchValidator(g: AbstractControl) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private getTokenParams() {
    const snapshot = this.route.snapshot;
    let token = snapshot.queryParamMap.get('token');
    let type = snapshot.queryParamMap.get('type') as EmailOtpType | null;
    let email = snapshot.queryParamMap.get('email');

    // Check hash fragment if query params are missing
    if (!token && snapshot.fragment) {
      const params = new URLSearchParams(snapshot.fragment);
      token = params.get('access_token');
      type = (params.get('type') as EmailOtpType) || 'recovery';
      email = params.get('email') || email;
    }
    return { token, type, email };
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.error = '';
    const password = this.form.get('password')?.value;

    try {
      // Check if we have a session
      const { data: { session } } = await this.supabase.client.auth.getSession();

      if (session) {
        // User is authenticated, just update password
        const { error: updateError } = await this.supabase.client.auth.updateUser({
          password: password!
        });
        if (updateError) throw updateError;
      } else {
        // No session, try to verify OTP
        const { token, type, email } = this.getTokenParams();

        if (token && email) {
          const { error: verifyError } = await this.supabase.client.auth.verifyOtp({
            email,
            token,
            type: type as EmailOtpType
          });
          if (verifyError) throw verifyError;

          // After verify, update password
          const { error: updateError } = await this.supabase.client.auth.updateUser({
            password: password!
          });
          if (updateError) throw updateError;
        } else {
          this.error = this.i18n.translate('invalidOrExpiredLink');
          this.loading = false;
          return;
        }
      }

      this.success = true;
      this.notification.addNotification(this.i18n.translate('passwordSetSuccess'));
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2500);

    } catch (error: any) {
      console.error('Error setting password:', error);
      this.error = this.i18n.translate('unexpectedPasswordError');
    } finally {
      this.loading = false;
    }
  }
}
