import { Component, Input } from '@angular/core';


type SkeletonType = 'text' | 'avatar' | 'card' | 'line' | 'rectangle';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [],
  template: `
    <div [class]="skeletonClasses">
      <div [class]="animationClass"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .skeleton-animate {
      background: linear-gradient(
        90deg,
        rgba(0, 0, 0, 0.05) 25%,
        rgba(0, 0, 0, 0.08) 50%,
        rgba(0, 0, 0, 0.05) 75%
      );
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
    }

    @keyframes loading {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
  `]
})
export class SkeletonComponent {
  @Input() type: SkeletonType = 'text';
  @Input() width = '100%';
  @Input() height = '1rem';
  @Input() count = 1;
  @Input() circle = false;

  get skeletonClasses(): string {
    const baseClasses = 'bg-neutral-200 rounded';
    
    const typeClasses = {
      'text': 'h-4 rounded',
      'avatar': 'h-12 w-12 rounded-full',
      'card': 'h-48 rounded-brand',
      'line': 'h-3 rounded',
      'rectangle': 'h-32 rounded-brand',
    };

    const customClasses = this.circle ? 'rounded-full' : '';
    
    return `${baseClasses} ${typeClasses[this.type]} ${customClasses}`;
  }

  get animationClass(): string {
    return `w-full h-full skeleton-animate ${this.circle ? 'rounded-full' : 'rounded'}`;
  }
}

@Component({
  selector: 'app-skeleton-group',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div [class]="containerClasses">
      <!-- Avatar + Text skeleton -->
      @if (type === 'card-with-avatar') {
        <div class="flex gap-4">
          <app-skeleton type="avatar"></app-skeleton>
          <div class="flex-1 space-y-2">
            <app-skeleton width="60%"></app-skeleton>
            <app-skeleton width="40%"></app-skeleton>
          </div>
        </div>
      }
    
      <!-- Múltiplas linhas -->
      @if (type === 'text-block') {
        <div class="space-y-3">
          <app-skeleton width="100%"></app-skeleton>
          <app-skeleton width="100%"></app-skeleton>
          <app-skeleton width="80%"></app-skeleton>
        </div>
      }
    
      <!-- Card completo -->
      @if (type === 'card') {
        <div class="space-y-4">
          <app-skeleton type="rectangle"></app-skeleton>
          <div class="space-y-2 p-4">
            <app-skeleton width="70%"></app-skeleton>
            <app-skeleton width="100%"></app-skeleton>
            <app-skeleton width="60%"></app-skeleton>
          </div>
        </div>
      }
    
      <!-- Tabela -->
      @if (type === 'table') {
        <div class="space-y-3">
          @for (row of Array(4); track row) {
            <div class="flex gap-4">
              <app-skeleton width="20%"></app-skeleton>
              <app-skeleton width="30%"></app-skeleton>
              <app-skeleton width="25%"></app-skeleton>
              <app-skeleton width="25%"></app-skeleton>
            </div>
          }
        </div>
      }
    </div>
    `,
  styles: []
})
export class SkeletonGroupComponent {
  @Input() type: 'card-with-avatar' | 'text-block' | 'card' | 'table' = 'text-block';
  
  Array = Array;

  get containerClasses(): string {
    return 'w-full';
  }
}

