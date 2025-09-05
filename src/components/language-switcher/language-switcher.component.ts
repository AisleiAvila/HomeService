import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService, Language } from '../../services/i18n.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <button (click)="isOpen.set(!isOpen())" class="flex items-center space-x-2 text-gray-500 hover:text-gray-800 bg-white bg-opacity-20 backdrop-blur-sm p-2 rounded-full">
        <i class="fas fa-globe"></i>
        <span class="uppercase text-sm font-medium">{{ i18n.language() }}</span>
      </button>
      @if (isOpen()) {
        <div class="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
          <a href="#" (click)="$event.preventDefault(); setLanguage('pt')" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Português</a>
          <a href="#" (click)="$event.preventDefault(); setLanguage('en')" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">English</a>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LanguageSwitcherComponent {
  i18n = inject(I18nService);
  isOpen = signal(false);

  setLanguage(lang: Language) {
    this.i18n.setLanguage(lang);
    this.isOpen.set(false);
  }
}
