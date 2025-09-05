import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './landing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  signIn = output<void>();
  createAccount = output<void>();
}
