import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { Router } from "@angular/router";
import { ServiceRequestFormComponent } from "../../../components/service-request-form/service-request-form.component";

@Component({
  selector: 'app-create-service-request',
  standalone: true,
  imports: [ServiceRequestFormComponent],
  template: `
    <div class="min-w-0 overflow-hidden">
      <app-service-request-form
        (closeForm)="goBack()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateServiceRequestComponent {
  private readonly router = inject(Router);

  goBack() {
    console.log('goBack chamado (pai)');
    if (globalThis.history.length > 1) {
      globalThis.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }
}
