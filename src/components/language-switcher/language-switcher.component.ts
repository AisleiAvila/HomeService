import { Component, ChangeDetectionStrategy, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService, Language } from '../../services/i18n.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-switcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LanguageSwitcherComponent {
  i18n = inject(I18nService);
  isOpen = signal(false);
  theme = input<'light' | 'dark'>('light');

  setLanguage(lang: Language) {
    this.i18n.setLanguage(lang);
    this.isOpen.set(false);
  }
}