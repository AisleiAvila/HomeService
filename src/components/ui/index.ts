/**
 * UI Components Library - Natan Construtora
 * Exporta todos os componentes de UI de forma centralizada
 */

export { ButtonComponent } from './button.component';
export { InputComponent } from './input.component';
export { SkeletonComponent, SkeletonGroupComponent } from './skeleton.component';
export { AlertComponent, LoadingComponent } from './feedback.component';
export { UiComponentsShowcaseComponent } from './ui-components-showcase.component';

/**
 * Array com todos os componentes para importação fácil
 * 
 * Uso:
 * import { UI_COMPONENTS } from '@/components/ui';
 * 
 * @Component({
 *   imports: [...UI_COMPONENTS]
 * })
 */
export const UI_COMPONENTS = [
  'ButtonComponent',
  'InputComponent',
  'SkeletonComponent',
  'SkeletonGroupComponent',
  'AlertComponent',
  'LoadingComponent',
  'UiComponentsShowcaseComponent',
];

