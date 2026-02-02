import { Component } from '@angular/core';

import { ButtonComponent } from './button.component';
import { InputComponent } from './input.component';
import { SkeletonGroupComponent } from './skeleton.component';
import { AlertComponent, LoadingComponent } from './feedback.component';

@Component({
  selector: 'app-ui-components-showcase',
  standalone: true,
  imports: [
    ButtonComponent,
    InputComponent,
    SkeletonGroupComponent,
    AlertComponent,
    LoadingComponent
],
  template: `
    <div class="min-h-screen bg-neutral-50 p-8">
      <div class="max-w-6xl mx-auto space-y-12">
        <!-- Header -->
        <header class="text-center space-y-2">
          <h1 class="text-4xl font-bold text-brand-primary-600">
            Componentes de UI - Natan Construtora
          </h1>
          <p class="text-lg text-brand-secondary-500">
            Sistema de componentes reutilizáveis e consistentes
          </p>
        </header>

        <!-- Buttons -->
        <section class="space-y-6">
          <h2 class="text-2xl font-bold text-brand-primary-700">Botões</h2>
          
          <div class="card-brand p-6 space-y-8">
            <!-- Primary Buttons -->
            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-brand-secondary-600">Primário</h3>
              <div class="flex flex-wrap gap-4">
                <app-button variant="primary" size="sm">Pequeno</app-button>
                <app-button variant="primary" size="md">Médio</app-button>
                <app-button variant="primary" size="lg">Grande</app-button>
                <app-button variant="primary" [loading]="buttonLoading" (onClick)="toggleButtonLoading()">
                  Carregando
                </app-button>
                <app-button variant="primary" [disabled]="true">Desabilitado</app-button>
              </div>
            </div>

            <!-- Secondary Buttons -->
            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-brand-secondary-600">Secundário</h3>
              <div class="flex flex-wrap gap-4">
                <app-button variant="secondary">Ação Secundária</app-button>
                <app-button variant="secondary" [loading]="true">Processando</app-button>
              </div>
            </div>

            <!-- Outline Buttons -->
            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-brand-secondary-600">Outline</h3>
              <div class="flex flex-wrap gap-4">
                <app-button variant="outline">Outline</app-button>
                <app-button variant="outline" icon="fas fa-edit">Com Ícone</app-button>
              </div>
            </div>

            <!-- Ghost Buttons -->
            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-brand-secondary-600">Ghost</h3>
              <div class="flex flex-wrap gap-4">
                <app-button variant="ghost">Ghost</app-button>
                <app-button variant="ghost" icon="fas fa-trash">Deletar</app-button>
              </div>
            </div>

            <!-- Danger Buttons -->
            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-brand-secondary-600">Perigo</h3>
              <div class="flex flex-wrap gap-4">
                <app-button variant="danger">Deletar Permanentemente</app-button>
              </div>
            </div>

            <!-- Icon Buttons -->
            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-brand-secondary-600">Com Ícones</h3>
              <div class="flex flex-wrap gap-4">
                <app-button variant="primary" icon="fas fa-plus">Adicionar</app-button>
                <app-button variant="secondary" icon="fas fa-save">Salvar</app-button>
                <app-button variant="outline" icon="fas fa-download">Baixar</app-button>
              </div>
            </div>
          </div>
        </section>

        <!-- Inputs -->
        <section class="space-y-6">
          <h2 class="text-2xl font-bold text-brand-primary-700">Inputs</h2>
          
          <div class="card-brand p-6 space-y-8">
            <!-- Text Input -->
            <div>
              <app-input
                label="Nome Completo"
                placeholder="Digite seu nome"
                [value]="inputValue"
                (valueChange)="inputValue = $event"
                helperText="Digite o seu nome completo"
              ></app-input>
            </div>

            <!-- Email Input -->
            <div>
              <app-input
                type="email"
                label="Email"
                placeholder="seu@email.com"
                iconLeft="fas fa-envelope"
                helperText="Usaremos para contato"
              ></app-input>
            </div>

            <!-- Input com Erro -->
            <div>
              <app-input
                label="CPF"
                placeholder="000.000.000-00"
                [error]="'CPF inválido. Verifique e tente novamente'"
              ></app-input>
            </div>

            <!-- Input Loading -->
            <div>
              <app-input
                label="Pesquisando..."
                placeholder="Procurando profissionais..."
                [loading]="true"
              ></app-input>
            </div>

            <!-- Input Success -->
            <div>
              <app-input
                label="Endereço Verificado"
                placeholder="Rua das Flores, 123"
                [success]="true"
                iconLeft="fas fa-map-pin"
              ></app-input>
            </div>

            <!-- Input com Contador -->
            <div>
              <app-input
                label="Descrição do Serviço"
                placeholder="Descreva detalhadamente o que você precisa..."
                [maxLength]="200"
                [value]="descriptionValue"
                (valueChange)="descriptionValue = $event"
              ></app-input>
            </div>

            <!-- Input Desabilitado -->
            <div>
              <app-input
                label="Campo Desabilitado"
                placeholder="Não pode ser editado"
                [disabled]="true"
                value="Valor fixo"
              ></app-input>
            </div>
          </div>
        </section>

        <!-- Loading States -->
        <section class="space-y-6">
          <h2 class="text-2xl font-bold text-brand-primary-700">Estados de Carregamento</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Spinner -->
            <div class="card-brand p-8 flex flex-col items-center justify-center min-h-64">
              <app-loading type="spinner" text="Carregando dados..."></app-loading>
            </div>

            <!-- Dots -->
            <div class="card-brand p-8 flex flex-col items-center justify-center min-h-64">
              <app-loading type="dots" text="Processando..."></app-loading>
            </div>

            <!-- Progress -->
            <div class="card-brand p-8 flex flex-col items-center justify-center min-h-64">
              <app-loading type="progress" [progress]="65" text="65% completo"></app-loading>
            </div>
          </div>
        </section>

        <!-- Skeletons -->
        <section class="space-y-6">
          <h2 class="text-2xl font-bold text-brand-primary-700">Skeleton Loaders</h2>
          
          <div class="space-y-6">
            <!-- Card with Avatar -->
            <div class="card-brand p-6">
              <h3 class="text-lg font-semibold mb-4">Card com Avatar</h3>
              <app-skeleton-group type="card-with-avatar"></app-skeleton-group>
            </div>

            <!-- Text Block -->
            <div class="card-brand p-6">
              <h3 class="text-lg font-semibold mb-4">Bloco de Texto</h3>
              <app-skeleton-group type="text-block"></app-skeleton-group>
            </div>

            <!-- Full Card -->
            <div class="card-brand p-6">
              <h3 class="text-lg font-semibold mb-4">Card Completo</h3>
              <app-skeleton-group type="card"></app-skeleton-group>
            </div>

            <!-- Table -->
            <div class="card-brand p-6">
              <h3 class="text-lg font-semibold mb-4">Tabela</h3>
              <app-skeleton-group type="table"></app-skeleton-group>
            </div>
          </div>
        </section>

        <!-- Alerts/Feedback -->
        <section class="space-y-6">
          <h2 class="text-2xl font-bold text-brand-primary-700">Alerts e Feedback</h2>
          
          <div class="space-y-4">
            <!-- Success -->
            <app-alert
              type="success"
              title="Sucesso!"
              message="Seu pedido foi criado com sucesso. Em breve um profissional entrará em contato."
            ></app-alert>

            <!-- Error -->
            <app-alert
              type="error"
              title="Erro ao processar"
              message="Houve um erro ao salvar seus dados. Verifique a conexão e tente novamente."
            ></app-alert>

            <!-- Warning -->
            <app-alert
              type="warning"
              title="Atenção"
              message="Este serviço requer verificação de identidade. Por favor, complete seu perfil."
            ></app-alert>

            <!-- Info -->
            <app-alert
              type="info"
              title="Informação"
              message="Novos profissionais foram adicionados à sua região. Confira as opções disponíveis."
            ></app-alert>
          </div>
        </section>

        <!-- Footer -->
        <footer class="text-center py-8 border-t border-neutral-200">
          <p class="text-neutral-600">
            Componentes de UI - Natan Construtora © 2025
          </p>
        </footer>
      </div>
    </div>
  `,
  styles: []
})
export class UiComponentsShowcaseComponent {
  buttonLoading = false;
  inputValue = '';
  descriptionValue = '';

  toggleButtonLoading() {
    this.buttonLoading = true;
    setTimeout(() => {
      this.buttonLoading = false;
    }, 2000);
  }
}

