import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-2">
      <!-- Label -->
      <label *ngIf="label" [for]="id" class="block text-sm font-medium" [class]="labelClass">
        {{ label }}
        <span *ngIf="required" class="text-semantic-error">*</span>
      </label>

      <!-- Input wrapper com ícones -->
      <div class="relative">
        <!-- Ícone esquerdo -->
        <i *ngIf="iconLeft" [class]="'absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 ' + iconClass"></i>

        <!-- Input -->
        <input
          [type]="type"
          [id]="id"
          [placeholder]="placeholder"
          [value]="value"
          [disabled]="disabled"
          [required]="required"
          (input)="onInput($event)"
          (change)="changed.emit($event)"
          (focus)="focused.emit()"
          (blur)="blurred.emit()"
          [class]="inputClasses"
          [attr.aria-label]="ariaLabel"
          [attr.aria-invalid]="error ? 'true' : 'false'"
          [attr.aria-describedby]="error ? id + '-error' : undefined"
        />

        <!-- Ícone direito (loading/check) -->
        <div class="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          <i *ngIf="loading" class="fas fa-spinner fa-spin text-brand-primary-500"></i>
          <i *ngIf="!loading && success" class="fas fa-check-circle text-green-500"></i>
        </div>
      </div>

      <!-- Helper text -->
      <p *ngIf="helperText && !error" class="text-xs text-neutral-600">
        {{ helperText }}
      </p>

      <!-- Error message -->
      <p *ngIf="error" [id]="id + '-error'" class="text-sm text-semantic-error font-medium">
        <i class="fas fa-exclamation-circle mr-1"></i>
        {{ error }}
      </p>

      <!-- Character count -->
      <p *ngIf="maxLength" class="text-xs text-neutral-500 text-right">
        {{ value.length }}/{{ maxLength }}
      </p>
    </div>
  `,
  styles: []
})
export class InputComponent implements OnInit {
  @Input() type: InputType = 'text';
  @Input() label = '';
  @Input() placeholder = '';
  @Input() value = '';
  @Input() disabled = false;
  @Input() required = false;
  @Input() error = '';
  @Input() helperText = '';
  @Input() loading = false;
  @Input() success = false;
  @Input() iconLeft = '';
  @Input() iconClass = 'text-lg';
  @Input() maxLength = 0;
  @Input() ariaLabel = '';
  @Input() id = 'input-' + Math.random().toString(36).substring(2, 11);

  @Output() valueChange = new EventEmitter<string>();
  @Output() changed = new EventEmitter<Event>();
  @Output() focused = new EventEmitter<void>();
  @Output() blurred = new EventEmitter<void>();

  ngOnInit() {
    if (!this.ariaLabel && this.label) {
      this.ariaLabel = this.label;
    }
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.valueChange.emit(this.value);
  }

  get labelClass(): string {
    return this.error ? 'text-semantic-error' : 'text-neutral-700';
  }

  get inputClasses(): string {
    const baseClasses = 'w-full px-4 py-3 rounded-brand border-2 transition-all duration-200 placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:cursor-not-allowed';
    const leftPadding = this.iconLeft ? 'pl-10' : 'px-4';
    const rightPadding = this.loading || this.success ? 'pr-10' : 'pr-4';
    
    const borderClasses = this.error
      ? 'border-semantic-error focus:border-semantic-error focus:ring-2 focus:ring-semantic-error focus:ring-opacity-20'
      : 'border-neutral-300 focus:border-brand-primary-500 focus:ring-2 focus:ring-brand-primary-500 focus:ring-opacity-20';

    return `${baseClasses} ${leftPadding} ${rightPadding} ${borderClasses}`;
  }
}

