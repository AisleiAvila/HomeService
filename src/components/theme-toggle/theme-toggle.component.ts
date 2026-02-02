import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, I18nPipe],
  template: `
        <button
          (click)="toggleTheme()"
          class="relative inline-flex items-center justify-center w-10 h-10 rounded-lg
            bg-neutral-100 dark:bg-neutral-800
            border border-neutral-300 dark:border-neutral-700
            hover:bg-neutral-200 dark:hover:bg-neutral-700
            transition-smooth focus:outline-none focus:ring-2 focus:ring-brand-primary-500"
          [attr.aria-label]="'toggle_theme' | i18n"
    >
      <!-- Ícone Sol -->
      @if (!themeService.isDarkMode()) {
        <svg class="w-5 h-5 text-brand-primary-500 animate-fade-in" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l-2.12-2.12a1 1 0 011.414-1.414l2.12 2.12a1 1 0 01-1.414 1.414zM2.05 6.464a1 1 0 010-1.414l1.414-1.415a1 1 0 111.414 1.414L3.464 6.464a1 1 0 010 1.414zm9.9 9.9a1 1 0 01-1.414-1.414l2.12-2.12a1 1 0 011.414 1.414l-2.12 2.12zM3.464 15.536a1 1 0 01-1.414-1.414l1.414-1.415a1 1 0 111.414 1.414l-1.414 1.415z" clip-rule="evenodd"></path>
        </svg>
      }
      
      <!-- Ícone Lua -->
      @if (themeService.isDarkMode()) {
        <svg class="w-5 h-5 text-yellow-400 animate-fade-in" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
        </svg>
      }
    </button>
  `,
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
