
import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from "@angular/core";
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
export class PendingApprovalsComponent implements OnInit {
    private readonly dataService = inject(DataService);
    private readonly i18n = inject(I18nService);
    private readonly notificationService = inject(NotificationService);

    ngOnInit() {
        console.log('[PendingApprovalsComponent] Inicializando - recarregando dados de usuários');
        this.dataService.reloadUsers();
    }

    pendingRegistrations = computed(() =>
        this.dataService.users().filter(
            (u) =>
                (u.role === "professional") &&
                (u.status === "Pending" || u.email_verified === false)
        )
    );

    async approveClient(userId: number) {
        await this.dataService.updateUser(userId, { status: "Active", email_verified: true });
        this.notificationService.showSuccess(
            this.i18n.translate("professionalApproved", { name: this.dataService.users().find(u => u.id === userId)?.name || '' })
        );
    }

    async rejectClient(userId: number) {
        const success = await this.dataService.updateUserStatus(userId, "Rejected");
        if (success) {
            this.notificationService.showError(
                this.i18n.translate("professionalRejected")
            );
        }
    }
}

