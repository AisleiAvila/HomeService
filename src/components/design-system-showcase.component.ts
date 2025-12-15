import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-design-system-showcase',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-neutral-50 p-8">
      <div class="max-w-7xl mx-auto space-y-12">
        <!-- Header -->
        <header class="text-center space-y-4">
          <h1 class="text-4xl font-bold text-brand-primary-600">
            Sistema de Design - Natan Construtora
          </h1>
          <p class="text-lg text-brand-secondary-500">
            Paleta de cores baseada no logo oficial
          </p>
          <div class="flex items-center justify-center gap-4 mt-4">
            <div class="w-8 h-8 bg-brand-primary-500 rounded-full shadow-brand"></div>
            <div class="w-8 h-8 bg-brand-secondary-500 rounded-full"></div>
            <div class="w-8 h-8 bg-brand-accent-500 rounded-full"></div>
          </div>
        </header>

        <!-- Paleta de Cores -->
        <section class="space-y-6">
          <h2 class="text-2xl font-bold text-brand-primary-700">Paleta de Cores</h2>
          
          <!-- Primary -->
          <div class="card-brand p-6 space-y-4">
            <h3 class="text-xl font-semibold text-brand-primary-600">🔴 Vermelho Coral - Cor Principal do Logo</h3>
            <p class="text-sm text-brand-secondary-500">Cor dominante do hexágono superior no logo oficial</p>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div class="space-y-2">
                <div class="h-20 bg-brand-primary-100 rounded-brand"></div>
                <p class="text-xs text-center font-mono">100</p>
              </div>
              <div class="space-y-2">
                <div class="h-20 bg-brand-primary-300 rounded-brand"></div>
                <p class="text-xs text-center font-mono">300</p>
              </div>
              <div class="space-y-2">
                <div class="h-20 bg-brand-primary-500 rounded-brand shadow-brand"></div>
                <p class="text-xs text-center font-mono font-bold">500 ⭐</p>
              </div>
              <div class="space-y-2">
                <div class="h-20 bg-brand-primary-700 rounded-brand"></div>
                <p class="text-xs text-center font-mono">700</p>
              </div>
              <div class="space-y-2">
                <div class="h-20 bg-brand-primary-900 rounded-brand"></div>
                <p class="text-xs text-center font-mono">900</p>
              </div>
            </div>
          </div>

          <!-- Secondary -->
          <div class="card-brand p-6 space-y-4">
            <h3 class="text-xl font-semibold text-brand-secondary-500">⚫ Preto/Cinza Escuro - Base Sólida</h3>
            <p class="text-sm text-brand-accent-500">Cor da base do hexágono no logo oficial</p>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div class="space-y-2">
                <div class="h-20 bg-brand-secondary-100 rounded-brand"></div>
                <p class="text-xs text-center font-mono">100</p>
              </div>
              <div class="space-y-2">
                <div class="h-20 bg-brand-secondary-300 rounded-brand"></div>
                <p class="text-xs text-center font-mono">300</p>
              </div>
              <div class="space-y-2">
                <div class="h-20 bg-brand-secondary-500 rounded-brand shadow-brand"></div>
                <p class="text-xs text-center font-mono font-bold">500 ⭐</p>
              </div>
              <div class="space-y-2">
                <div class="h-20 bg-brand-secondary-700 rounded-brand"></div>
                <p class="text-xs text-center font-mono">700</p>
              </div>
              <div class="space-y-2">
                <div class="h-20 bg-brand-secondary-900 rounded-brand"></div>
                <p class="text-xs text-center font-mono">900</p>
              </div>
            </div>
          </div>

          <!-- Accent -->
          <div class="card-brand p-6 space-y-4">
            <h3 class="text-xl font-semibold text-brand-accent-600">🔳 Cinza Claro - Texto Secundário</h3>
            <p class="text-sm text-brand-secondary-500">Tom usado no texto "CONSTRUTORA" do logo</p>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div class="space-y-2">
                <div class="h-20 bg-brand-accent-100 rounded-brand"></div>
                <p class="text-xs text-center font-mono">100</p>
              </div>
              <div class="space-y-2">
                <div class="h-20 bg-brand-accent-300 rounded-brand"></div>
                <p class="text-xs text-center font-mono">300</p>
              </div>
              <div class="space-y-2">
                <div class="h-20 bg-brand-accent-500 rounded-brand shadow-brand"></div>
                <p class="text-xs text-center font-mono font-bold">500 ⭐</p>
              </div>
              <div class="space-y-2">
                <div class="h-20 bg-brand-accent-700 rounded-brand"></div>
                <p class="text-xs text-center font-mono">700</p>
              </div>
              <div class="space-y-2">
                <div class="h-20 bg-brand-accent-900 rounded-brand"></div>
                <p class="text-xs text-center font-mono">900</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Botões -->
        <section class="space-y-6">
          <h2 class="text-2xl font-bold text-brand-primary-700">Botões</h2>
          
          <div class="card-brand p-6 space-y-6">
            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-neutral-800">Variações</h3>
              <div class="flex flex-wrap gap-4">
                <button class="btn-brand">Primário</button>
                <button class="btn-brand-secondary">Secundário</button>
                <button class="btn-brand-outline">Outline</button>
                <button class="btn-brand-ghost">Ghost</button>
              </div>
            </div>

            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-neutral-800">Tamanhos</h3>
              <div class="flex flex-wrap items-center gap-4">
                <button class="btn-brand px-3 py-1.5 text-sm">Pequeno</button>
                <button class="btn-brand">Médio</button>
                <button class="btn-brand px-8 py-4 text-lg">Grande</button>
              </div>
            </div>

            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-neutral-800">Com Ícones</h3>
              <div class="flex flex-wrap gap-4">
                <button class="btn-brand flex items-center gap-2">
                  <i class="fas fa-plus"></i>
                  Adicionar
                </button>
                <button class="btn-brand-secondary flex items-center gap-2">
                  <i class="fas fa-save"></i>
                  Salvar
                </button>
                <button class="btn-brand-outline flex items-center gap-2">
                  <i class="fas fa-edit"></i>
                  Editar
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Cards -->
        <section class="space-y-6">
          <h2 class="text-2xl font-bold text-brand-primary-700">Cards</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="card-brand p-6 space-y-4">
              <h3 class="text-xl font-semibold text-brand-primary-700">Card Padrão</h3>
              <p class="text-neutral-600">
                Shadow suave para hierarquia visual. Perfeito para conteúdo padrão.
              </p>
              <div class="flex gap-3">
                <button class="btn-brand-ghost">Ação 1</button>
                <button class="btn-brand">Ação 2</button>
              </div>
            </div>

            <div class="card-brand-elevated p-6 space-y-4">
              <h3 class="text-xl font-semibold text-brand-primary-700">Card Elevado</h3>
              <p class="text-neutral-600">
                Shadow acentuada para destaque. Usado em elementos importantes.
              </p>
              <div class="flex gap-3">
                <button class="btn-brand-ghost">Ação 1</button>
                <button class="btn-brand">Ação 2</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Badges -->
        <section class="space-y-6">
          <h2 class="text-2xl font-bold text-brand-primary-700">Badges</h2>
          
          <div class="card-brand p-6">
            <div class="flex flex-wrap gap-3">
              <span class="badge-brand">Primário</span>
              <span class="badge-success">Sucesso</span>
              <span class="badge-warning">Aviso</span>
              <span class="badge-error">Erro</span>
            </div>
          </div>
        </section>

        <!-- Inputs -->
        <section class="space-y-6">
          <h2 class="text-2xl font-bold text-brand-primary-700">Inputs</h2>
          
          <div class="card-brand p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                Input Padrão
              </label>
              <input type="text" class="input-brand" placeholder="Digite algo...">
            </div>

            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                Input com Erro
              </label>
              <input type="text" class="input-brand input-brand-error" placeholder="Campo obrigatório">
              <p class="mt-2 text-sm text-semantic-error">Este campo é obrigatório</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                Textarea
              </label>
              <textarea class="input-brand" rows="4" placeholder="Descreva seu pedido..."></textarea>
            </div>
          </div>
        </section>

        <!-- Gradientes -->
        <section class="space-y-6">
          <h2 class="text-2xl font-bold text-brand-primary-700">Gradientes</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="gradient-brand p-8 rounded-brand text-white text-center">
              <h3 class="text-2xl font-bold mb-2">Gradiente Primário</h3>
              <p>Azul profissional</p>
            </div>

            <div class="gradient-brand-secondary p-8 rounded-brand text-white text-center">
              <h3 class="text-2xl font-bold mb-2">Gradiente Secundário</h3>
              <p>Energia e inovação</p>
            </div>
          </div>
        </section>

        <!-- Skeleton Loaders -->
        <section class="space-y-6">
          <h2 class="text-2xl font-bold text-brand-primary-700">Skeleton Loaders</h2>
          
          <div class="card-brand p-6 space-y-4">
            <div class="flex items-center gap-4">
              <div class="skeleton-avatar"></div>
              <div class="flex-1 space-y-2">
                <div class="skeleton-text w-3/4"></div>
                <div class="skeleton-text w-1/2"></div>
              </div>
            </div>
            <div class="skeleton h-32 w-full"></div>
          </div>
        </section>

        <!-- Animações -->
        <section class="space-y-6">
          <h2 class="text-2xl font-bold text-brand-primary-700">Animações</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="card-brand p-6 text-center animate-fade-in">
              <p class="font-semibold">Fade In</p>
            </div>
            <div class="card-brand p-6 text-center animate-slide-up">
              <p class="font-semibold">Slide Up</p>
            </div>
            <div class="card-brand p-6 text-center animate-slide-down">
              <p class="font-semibold">Slide Down</p>
            </div>
            <div class="card-brand p-6 text-center animate-scale-in">
              <p class="font-semibold">Scale In</p>
            </div>
          </div>
        </section>

        <!-- Footer -->
        <footer class="text-center py-8 border-t border-neutral-200">
          <p class="text-neutral-600">
            Sistema de Design - Natan Construtora © 2025
          </p>
        </footer>
      </div>
    </div>
  `,
  styles: []
})
export class DesignSystemShowcaseComponent {}
