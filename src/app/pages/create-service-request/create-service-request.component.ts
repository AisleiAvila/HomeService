import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { ServiceRequestFormComponent } from "../../../components/service-request-form/service-request-form.component";
import { I18nPipe } from "../../../pipes/i18n.pipe";

@Component({
  selector: 'app-create-service-request',
  standalone: true,
  imports: [CommonModule, ServiceRequestFormComponent, I18nPipe],
  template: `
    <div class="space-y-4 sm:space-y-6 min-w-0 overflow-hidden px-2 sm:px-0">
      <div>
        <h2 class="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 break-words">
          {{ "newServiceRequest" | i18n }}
        </h2>
        <p class="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
          {{ 'serviceRequestDescription' | i18n }}
        </p>
      </div>
      
      <app-service-request-form
        (close)="goBack()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateServiceRequestComponent {
  private readonly router = inject(Router);

  goBack() {
    if (globalThis.history.length > 1) {
      globalThis.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }
}
