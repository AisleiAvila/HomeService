
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProfessionalService } from '../services/professional.service';

@Component({
  selector: 'app-professional-register',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form class="max-w-md mx-auto p-4" (ngSubmit)="submit()">
      <input type="text" [(ngModel)]="name" name="name" placeholder="Nome" required class="input mb-2" />
      <input type="email" [(ngModel)]="email" name="email" placeholder="E-mail" required class="input mb-2" />
      <input type="text" [(ngModel)]="phone" name="phone" placeholder="Telefone" required class="input mb-2" />
      <input type="text" [(ngModel)]="specialty" name="specialty" placeholder="Especialidade" required class="input mb-2" />
      <button type="submit" class="btn btn-primary w-full" [disabled]="service.loading()">Cadastrar</button>
      @if (service.error()) {
        <div class="text-red-600 mt-2">{{ service.error() }}</div>
      }
      @if (success) {
        <div class="text-green-600 mt-2">Cadastro realizado! Verifique seu e-mail.</div>
      }
    </form>
    `
})
export class ProfessionalRegisterComponent {
  service: ProfessionalService = inject(ProfessionalService);
  name = '';
  email = '';
  phone = '';
  specialty = '';
  success = false;

  async submit() {
    const ok = await this.service.registerProfessional({
      name: this.name,
      email: this.email,
      phone: this.phone,
      specialty: this.specialty,
    });
    this.success = ok;
  }
}
