import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_STORAGE_KEY = 'natan-theme-preference';
  
  currentTheme = signal<Theme>('system');
  isDarkMode = signal(false);
  
  constructor() {
    this.initializeTheme();
    
    // Efeito para aplicar o tema quando mudar
    effect(() => {
      this.applyTheme(this.currentTheme());
    });
  }
  
  /**
   * Inicializa o tema baseado nas preferências do utilizador
   */
  private initializeTheme(): void {
    const savedTheme = this.getStoredTheme();
    this.currentTheme.set(savedTheme);
    
    // Observar mudanças de preferência do sistema
    if (globalThis && 'matchMedia' in globalThis) {
      const darkModeQuery = globalThis.matchMedia('(prefers-color-scheme: dark)');
      darkModeQuery.addEventListener('change', (e) => {
        if (this.currentTheme() === 'system') {
          this.isDarkMode.set(e.matches);
        }
      });
    }
  }
  
  /**
   * Obtém o tema armazenado no localStorage
   */
  private getStoredTheme(): Theme {
    try {
      const stored = localStorage.getItem(this.THEME_STORAGE_KEY) as Theme;
      return stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
    } catch {
      return 'system';
    }
  }
  
  /**
   * Define o tema atual
   */
  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    try {
      localStorage.setItem(this.THEME_STORAGE_KEY, theme);
    } catch {
      console.warn('Não foi possível guardar preferência de tema');
    }
  }
  
  /**
   * Alterna entre light/dark (se system, respeita preferência do SO)
   */
  toggleTheme(): void {
    const current = this.currentTheme();
    if (current === 'system') {
      // Se system, alternar para light ou dark baseado na preferência atual
      this.setTheme(this.isDarkMode() ? 'light' : 'dark');
    } else if (current === 'light') {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }
  
  /**
   * Aplica o tema ao documento HTML
   */
  private applyTheme(theme: Theme): void {
    const htmlElement = document.documentElement;
    
    if (theme === 'system') {
      // Verificar preferência do sistema
      const prefersDark = globalThis && 'matchMedia' in globalThis 
        ? globalThis.matchMedia('(prefers-color-scheme: dark)').matches 
        : false;
      this.isDarkMode.set(prefersDark);
      prefersDark ? htmlElement.classList.add('dark') : htmlElement.classList.remove('dark');
    } else if (theme === 'dark') {
      this.isDarkMode.set(true);
      htmlElement.classList.add('dark');
    } else {
      this.isDarkMode.set(false);
      htmlElement.classList.remove('dark');
    }
  }
  
  /**
   * Retorna a classe CSS apropriada para um elemento
   */
  getThemeClass(lightClass: string, darkClass: string): string {
    return this.isDarkMode() ? darkClass : lightClass;
  }
}
