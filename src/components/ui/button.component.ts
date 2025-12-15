import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [class]="buttonClasses"
      (click)="clicked.emit()"
      [attr.aria-busy]="loading"
      [attr.aria-label]="ariaLabel"
    >
      <!-- Loading spinner -->
      <div *ngIf="loading" class="inline-flex items-center gap-2">
        <i class="fas fa-spinner fa-spin"></i>
        <span *ngIf="!iconOnly">{{ loadingText }}</span>
      </div>

      <!-- Normal state -->
      <div *ngIf="!loading" class="flex items-center justify-center gap-2">
        <i *ngIf="icon" [class]="icon"></i>
        <span *ngIf="!iconOnly"><ng-content></ng-content></span>
      </div>
    </button>
  `,
  styles: []
})
export class ButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() loadingText = 'Carregando...';
  @Input() icon: string | null = null;
  @Input() iconOnly = false;
  @Input() ariaLabel = '';
  @Output() clicked = new EventEmitter<void>();

  get buttonClasses(): string {
    const baseClasses = 'font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const sizeClasses = {
      'sm': 'px-3 py-1.5 text-sm rounded',
      'md': 'px-6 py-3 text-base rounded-brand',
      'lg': 'px-8 py-4 text-lg rounded-brand',
    };

    const variantClasses = {
      'primary': 'btn-brand focus:ring-brand-primary-500',
      'secondary': 'btn-brand-secondary focus:ring-brand-secondary-500',
      'outline': 'btn-brand-outline focus:ring-brand-primary-500',
      'ghost': 'btn-brand-ghost focus:ring-brand-primary-500',
      'danger': 'bg-semantic-error text-white hover:bg-red-700 active:bg-red-800 shadow-md focus:ring-semantic-error',
    };

    return `${baseClasses} ${sizeClasses[this.size]} ${variantClasses[this.variant]}`;
  }
}

