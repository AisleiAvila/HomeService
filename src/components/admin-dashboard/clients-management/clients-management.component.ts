
import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { User } from "../../../models/maintenance.models";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { DataService } from "../../../services/data.service";
import { I18nService } from "../../../i18n.service";

@Component({
    selector: "app-clients-management",
    standalone: true,
    imports: [CommonModule, FormsModule, I18nPipe],
    templateUrl: "./clients-management.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsManagementComponent {
    private readonly dataService = inject(DataService);
    private readonly i18n = inject(I18nService);

    clients = computed(() =>
        this.dataService.users().filter((u) => u.role === "admin")
    );

    // Add Client Form
    showAddClientForm = signal(false);
    newClientName = signal("");
    newClientEmail = signal("");

    // Edit Client
    editingClient = signal<User | null>(null);
    editingClientName = signal("");
    editingClientEmail = signal("");

    toggleAddClientForm() {
        this.showAddClientForm.update((v) => !v);
    }

    resetNewClientForm() {
        this.newClientName.set("");
        this.newClientEmail.set("");
        this.showAddClientForm.set(false);
    }

    addClient() {
        // Implement add client logic
        console.log("Add client:", {
            name: this.newClientName(),
            email: this.newClientEmail(),
        });
        this.resetNewClientForm();
    }

    startEditClient(client: User) {
        this.editingClient.set(client);
        this.editingClientName.set(client.name);
        this.editingClientEmail.set(client.email);
    }
}
