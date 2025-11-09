import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AdminServiceRequestFormComponent } from "../../../components/admin-service-request-form/admin-service-request-form.component";
import { Router } from "@angular/router";
import { I18nPipe } from "../../../pipes/i18n.pipe";

@Component({
  selector: 'app-admin-create-service-request',
  standalone: true,
  imports: [CommonModule, AdminServiceRequestFormComponent, I18nPipe],
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
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }
}
