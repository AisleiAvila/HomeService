import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { AdminServiceRequestFormComponent } from "../../../components/admin-service-request-form/admin-service-request-form.component";
import { Router } from "@angular/router";

@Component({
  selector: 'app-admin-create-service-request',
  standalone: true,
  imports: [AdminServiceRequestFormComponent],
  template: `
    <div class="w-full h-full">
      <app-admin-service-request-form
        (closeModal)="goBack()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCreateServiceRequestComponent {
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
