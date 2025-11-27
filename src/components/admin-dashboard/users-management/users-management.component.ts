
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
            // 1. Gera token único para confirmação
            const token = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now();
            console.log('Token de confirmação gerado: ', token);

            // 2. Gera senha temporária
            const tempPassword = Math.random().toString(36).slice(-8);
            console.log('**************Senha temporária gerada:', tempPassword);

            // 3. Monta o link e o HTML usando o token recém-gerado
            const confirmLink = `https://home-service-nu.vercel.app/confirmar-email?email=${encodeURIComponent(email)}&token=${token}`;
            const html = `<p>Olá ${name},</p>
                <p>Seu cadastro como ${role === 'admin' ? 'administrador' : 'usuário'} foi realizado com sucesso.<br>
                Use a senha temporária abaixo para acessar o sistema pela primeira vez:<br>
                <b>${tempPassword}</b></p>
                <p>Antes de acessar, confirme seu e-mail clicando no link abaixo:</p>
                <p><a href='${confirmLink}'>Confirmar e-mail</a></p>
                <p>Após o primeiro login, você será redirecionado para definir uma nova senha.</p>`;

            // 4. Cria usuário via backend customizado
            const res = await fetch('http://localhost:4002/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    phone: '', // Administradores não precisam de telefone
                    specialty: '', // Administradores não têm especialidade
                    role,
                    status: 'Active', // Administradores já são ativados
                    confirmation_token: token,
                    password: tempPassword
                })
            });

            if (!res.ok) {
                let errText = await res.text();
                let errJson;
                try {
                    errJson = JSON.parse(errText);
                } catch {
                    errJson = { message: errText };
                }
                console.error('Erro backend customizado:', errJson);
                this.notificationService.addNotification(
                    this.i18n.translate("errorAddingClient") + `: ${errJson?.message || errText}`
                );
                return;
            }

            // 5. Dispara e-mail de confirmação
            console.log('Enviando e-mail de confirmação:', {
                to: email,
                subject: 'Confirmação de cadastro - HomeService',
                html,
                token,
                tempPassword
            });

            await fetch('http://localhost:4001/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    subject: 'Confirmação de cadastro - HomeService',
                    html,
                    token,
                    tempPassword: tempPassword || ''
                })
            });

            this.notificationService.addNotification(
                this.i18n.translate("professionalAdded", { name }) + `. ${this.i18n.translate("temporaryPassword")}: ${tempPassword}`
            );
            
            await this.dataService.fetchUsers();
            this.resetNewClientForm();
        } catch (error: any) {
            console.error("Error adding user:", error);
            this.notificationService.addNotification(
                this.i18n.translate("errorAddingClient") + `: ${error.message || error}`
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
