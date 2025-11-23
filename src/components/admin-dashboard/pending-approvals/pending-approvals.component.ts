
import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { DataService } from "../../../services/data.service";
import { I18nService } from "../../../i18n.service";
import { NotificationService } from "../../../services/notification.service";

@Component({
    selector: "app-pending-approvals",
    standalone: true,
    imports: [CommonModule, I18nPipe],
    templateUrl: "./pending-approvals.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingApprovalsComponent {
    private readonly dataService = inject(DataService);
    private readonly i18n = inject(I18nService);
    private readonly notificationService = inject(NotificationService);

    pendingRegistrations = computed(() =>
        this.dataService.users().filter(
            (u) =>
                (u.role === "professional") &&
                (u.status === "Pending" || u.email_verified === false)
        )
    );

    approveClient(userId: number) {
        this.dataService.updateUserStatus(userId, "Active");
        this.notificationService.showSuccess(
            this.i18n.translate("professionalApproved")
        );
    }

    rejectClient(userId: number) {
        this.dataService.updateUserStatus(userId, "Rejected");
        this.notificationService.showError(
            this.i18n.translate("professionalRejected")
        );
    }
}
