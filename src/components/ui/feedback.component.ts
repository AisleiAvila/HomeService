import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

type FeedbackType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="visible" [class]="alertClasses" role="alert">
      <div class="flex items-start gap-4">
        <!-- Icon -->
        <i [class]="iconClasses" [attr.aria-hidden]="'true'"></i>

        <!-- Content -->
        <div class="flex-1">
          <h3 *ngIf="title" [class]="titleClasses">
            {{ title }}
          </h3>
          <p *ngIf="message" [class]="messageClasses">
            {{ message }}
          </p>
          <ng-content></ng-content>
        </div>

        <!-- Close button -->
        <button
          *ngIf="closeable"
          (click)="closed.emit()"
          class="text-inherit hover:opacity-70 transition-opacity"
          [attr.aria-label]="'Fechar ' + type"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `,
  styles: []
})
export class AlertComponent implements OnInit {
  @Input() type: FeedbackType = 'info';
  @Input() title = '';
  @Input() message = '';
  @Input() closeable = true;
  @Input() visible = true;
  @Input() autoClose = 0; // 0 = manual, > 0 = ms

  @Output() closed = new EventEmitter<void>();

  ngOnInit() {
    if (this.autoClose > 0) {
      setTimeout(() => this.close(), this.autoClose);
    }
  }

  close() {
    this.visible = false;
    this.closed.emit();
  }

  get alertClasses(): string {
    const baseClasses = 'p-4 rounded-brand border-l-4 transition-all duration-200';
    
    const typeClasses = {
      'success': 'bg-green-50 border-green-500 text-green-800',
      'error': 'bg-red-50 border-semantic-error text-semantic-error',
      'warning': 'bg-yellow-50 border-semantic-warning text-yellow-800',
      'info': 'bg-brand-primary-50 border-semantic-info text-brand-primary-800',
    };

    return `${baseClasses} ${typeClasses[this.type]}`;
  }

  get iconClasses(): string {
    const icons = {
      'success': 'fas fa-check-circle text-green-500 text-xl',
      'error': 'fas fa-exclamation-circle text-semantic-error text-xl',
      'warning': 'fas fa-exclamation-triangle text-yellow-600 text-xl',
      'info': 'fas fa-info-circle text-semantic-info text-xl',
    };

    return icons[this.type];
  }

  get titleClasses(): string {
    return 'font-semibold mb-1';
  }

  get messageClasses(): string {
    return 'text-sm opacity-90';
  }
}

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="loadingClasses">
      <!-- Spinner -->
      <div *ngIf="type === 'spinner'" class="relative w-12 h-12">
        <i class="fas fa-spinner fa-spin text-4xl text-brand-primary-500"></i>
      </div>

      <!-- Dots -->
      <div *ngIf="type === 'dots'" class="flex gap-2">
        <div class="w-3 h-3 rounded-full bg-brand-primary-500 animate-bounce" style="animation-delay: 0s"></div>
        <div class="w-3 h-3 rounded-full bg-brand-primary-500 animate-bounce" style="animation-delay: 0.2s"></div>
        <div class="w-3 h-3 rounded-full bg-brand-primary-500 animate-bounce" style="animation-delay: 0.4s"></div>
      </div>

      <!-- Progress bar -->
      <div *ngIf="type === 'progress'" class="w-full h-1 bg-neutral-200 rounded-full overflow-hidden">
        <div class="h-full bg-brand-primary-500 animate-pulse" [style.width]="progress + '%'"></div>
      </div>

      <!-- Text -->
      <p *ngIf="text" class="mt-4 text-sm text-neutral-600 text-center">
        {{ text }}
      </p>
    </div>
  `,
  styles: []
})
export class LoadingComponent {
  @Input() type: 'spinner' | 'dots' | 'progress' = 'spinner';
  @Input() text = '';
  @Input() progress = 0;
  @Input() fullScreen = false;
  @Input() overlay = false;

  get loadingClasses(): string {
    const baseClasses = 'flex flex-col items-center justify-center';
    const fullScreenClasses = this.fullScreen ? 'fixed inset-0 z-50 bg-white/80' : '';
    const overlayClasses = this.overlay ? 'absolute inset-0 bg-black/20' : '';

    return `${baseClasses} ${fullScreenClasses} ${overlayClasses}`;
  }
}

