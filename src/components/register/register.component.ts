import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserRole } from '../../models/maintenance.models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex items-center justify-center min-h-full p-4 sm:p-6 lg:p-8">
      <div class="w-full max-w-md space-y-8">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Criar uma nova conta
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Ou
            <a href="#" (click)="$event.preventDefault(); switchToLogin.emit()" class="font-medium text-indigo-600 hover:text-indigo-500">
              faça login na sua conta existente
            </a>
          </p>
        </div>
        <form class="mt-8 space-y-6" #registerForm="ngForm" (ngSubmit)="register()">
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="name" class="sr-only">Nome</label>
              <input id="name" name="name" type="text" required
                     class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                     placeholder="Nome completo"
                     [ngModel]="name()" (ngModelChange)="name.set($event)">
            </div>
            <div>
              <label for="email-address" class="sr-only">Endereço de e-mail</label>
              <input id="email-address" name="email" type="email" autocomplete="email" required
                     class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                     placeholder="Endereço de e-mail"
                     [ngModel]="email()" (ngModelChange)="email.set($event)">
            </div>
            <div>
              <label for="password" class="sr-only">Senha</label>
              <input id="password" name="password" type="password" autocomplete="current-password" required
                     class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                     placeholder="Senha"
                     [ngModel]="password()" (ngModelChange)="password.set($event)">
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="text-sm">
                <span class="font-medium text-gray-900">Eu sou um:</span>
                <div class="mt-2 space-y-2">
                    <div class="flex items-center">
                        <input id="role-client" name="role" type="radio" value="client"
                               (change)="role.set('client')" [checked]="role() === 'client'"
                               class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300">
                        <label for="role-client" class="ml-3 block text-sm font-medium text-gray-700">Cliente</label>
                    </div>
                    <div class="flex items-center">
                        <input id="role-professional" name="role" type="radio" value="professional"
                               (change)="role.set('professional')" [checked]="role() === 'professional'"
                               class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300">
                        <label for="role-professional" class="ml-3 block text-sm font-medium text-gray-700">Profissional</label>
                    </div>
                </div>
            </div>
          </div>

          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button type="submit" [disabled]="!registerForm.valid"
                    class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm disabled:bg-indigo-300 disabled:cursor-not-allowed">
              Registrar
            </button>
            <button type="button" (click)="switchToLanding.emit()"
                    class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  registered = output<{email: string, role: UserRole}>();
  switchToLogin = output<void>();
  switchToLanding = output<void>();

  name = signal('');
  email = signal('');
  password = signal('');
  role = signal<UserRole>('client');

  register() {
    if (this.name() && this.email() && this.password()) {
      // In a real app, you'd call a service here.
      // For this demo, we just emit the data.
      console.log(`Registering ${this.email()} as ${this.role()}`);
      this.registered.emit({ email: this.email(), role: this.role() });
    }
  }
}