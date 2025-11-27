
import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { User, UserRole } from "../../../models/maintenance.models";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { DataService } from "../../../services/data.service";
import { I18nService } from "../../../i18n.service";
import { NotificationService } from "../../../services/notification.service";
import { SupabaseService } from "../../../services/supabase.service";

@Component({
    selector: "app-users-management",
    standalone: true,
    imports: [CommonModule, FormsModule, I18nPipe],
    templateUrl: "./users-management.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersManagementComponent {
    private readonly dataService = inject(DataService);
    private readonly i18n = inject(I18nService);
    private readonly notificationService = inject(NotificationService);
    private readonly supabase = inject(SupabaseService);

    clients = computed(() =>
        this.dataService.users().filter((u) => u.role === "client")
    );

    // Available roles for client registration
    readonly availableRoles: UserRole[] = ["admin"];

    // Add Client Form
    showAddClientForm = signal(false);
    newClientName = signal("");
    newClientEmail = signal("");
    newClientRole = signal<UserRole>("client");

    // Edit Client
    editingClient = signal<User | null>(null);
    editingClientName = signal("");
    editingClientEmail = signal("");
    editingClientRole = signal<UserRole>("client");

    toggleAddClientForm() {
        this.showAddClientForm.update((v) => !v);
    }

    resetNewClientForm() {
        this.newClientName.set("");
        this.newClientEmail.set("");
        this.newClientRole.set("client");
        this.showAddClientForm.set(false);
    }

    async addClient() {
        const name = this.newClientName();
        const email = this.newClientEmail();
        const role = this.newClientRole();

        if (!name || !email || !role) {
            this.notificationService.addNotification(
                this.i18n.translate("fillRequiredFields")
            );
            return;
        }

        try {
            // Create new user in database
            const newUser: Partial<User> = {
                name,
                email,
                role,
                status: "Active",
                avatar_url: "",
                auth_id: "", // Will be set by Supabase
            };

            const success = await this.dataService.addProfessional(newUser);
            
            if (success) {
                this.notificationService.addNotification(
                    this.i18n.translate("professionalAdded", { name })
                );
                await this.dataService.fetchUsers();
                this.resetNewClientForm();
            }
        } catch (error) {
            console.error("Error adding client:", error);
            this.notificationService.addNotification(
                this.i18n.translate("errorAddingClient")
            );
        }
    }

    startEditClient(client: User) {
        this.editingClient.set(client);
        this.editingClientName.set(client.name);
        this.editingClientEmail.set(client.email);
        this.editingClientRole.set(client.role);
    }

    async saveClientEdit() {
        const client = this.editingClient();
        if (!client) return;

        const name = this.editingClientName();
        const email = this.editingClientEmail();
        const role = this.editingClientRole();

        if (!name || !email || !role) {
            this.notificationService.addNotification(
                this.i18n.translate("fillRequiredFields")
            );
            return;
        }

        try {
            const { error } = await this.supabase.client
                .from("users")
                .update({ name, email, role })
                .eq("id", client.id);

            if (error) {
                throw error;
            }

            this.notificationService.addNotification(
                this.i18n.translate("professionalUpdated", { name })
            );
            await this.dataService.fetchUsers();
            this.cancelEdit();
        } catch (error) {
            console.error("Error updating client:", error);
            this.notificationService.addNotification(
                this.i18n.translate("errorUpdatingClient")
            );
        }
    }

    cancelEdit() {
        this.editingClient.set(null);
        this.editingClientName.set("");
        this.editingClientEmail.set("");
        this.editingClientRole.set("client");
    }

    getRoleLabel(role: UserRole): string {
        return this.i18n.translate(role);
    }
}
