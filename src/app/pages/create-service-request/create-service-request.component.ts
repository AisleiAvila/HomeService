import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ServiceRequestFormComponent } from "../../../components/service-request-form/service-request-form.component";
import { AuthService } from "../../../services/auth.service";
import { DataService } from "../../../services/data.service";
import { NotificationService } from "../../../services/notification.service";
import { ServiceRequestPayload } from "../../../models/maintenance.models";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { I18nService } from "../../../i18n.service";
import { Router } from "@angular/router";

@Component({
  selector: 'app-create-service-request',
  standalone: true,
  imports: [CommonModule, ServiceRequestFormComponent, I18nPipe],
  template: `
    <div class="w-full flex flex-col items-center justify-center bg-white pt-2 pb-0">
      <h2 class="text-2xl md:text-3xl font-extrabold text-indigo-700 drop-shadow-sm mb-2 text-center">
        {{ "newServiceRequest" | i18n }}
      </h2>
    </div>
    <div class="w-full h-full flex flex-col bg-white p-6">
      <app-service-request-form
        (close)="goBack()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateServiceRequestComponent {
  private readonly authService = inject(AuthService);
  private readonly dataService = inject(DataService);
  private readonly notificationService = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  
  currentUser = this.authService.appUser;

  goBack() {
    if (globalThis.history.length > 1) {
      globalThis.history.back();
    } else {
      this.router.navigate(['/']); // Fallback route
    }
  }

  async handleFormSubmitted(payload: ServiceRequestPayload) {
    try {
      this.notificationService.addNotification(this.i18n.translate("creating_service_request"));
      await this.dataService.addServiceRequest(payload);
      this.notificationService.addNotification(this.i18n.translate("service_request_created_successfully"));
      this.goBack();
    } catch (error) {
      console.error("Error creating service request:", error);
      this.notificationService.addNotification(this.i18n.translate("error_creating_service_request"));
    }
  }
}
