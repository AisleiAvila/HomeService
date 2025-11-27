
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

    // Helper para usar no template
    readonly Math = Math;

    // Filtros e Busca
    searchTerm = signal("");
    filterRole = signal<UserRole | "all">("all");
    filterStatus = signal<"all" | "Active" | "Inactive" | "Pending" | "Rejected">("all");

    // Paginação
    currentPage = signal(1);
    itemsPerPage = signal(10);
    readonly itemsPerPageOptions = [10, 25, 50, 100];

    // Lista filtrada e paginada
    filteredClients = computed(() => {
        let users = this.dataService.users()
            .filter((u) => u.role === "client" || u.role === "admin");

        // Aplicar busca
        const search = this.searchTerm().toLowerCase();
        if (search) {
            users = users.filter(u => 
                u.name.toLowerCase().includes(search) ||
                u.email.toLowerCase().includes(search)
            );
        }

        // Aplicar filtro de role
        const role = this.filterRole();
        if (role !== "all") {
            users = users.filter(u => u.role === role);
        }

        // Aplicar filtro de status
        const status = this.filterStatus();
        if (status !== "all") {
            users = users.filter(u => u.status === status);
        }

        return users;
    });

    // Total de páginas
    totalPages = computed(() => 
        Math.ceil(this.filteredClients().length / this.itemsPerPage())
    );

    // Usuários da página atual
    clients = computed(() => {
        const start = (this.currentPage() - 1) * this.itemsPerPage();
        const end = start + this.itemsPerPage();
        return this.filteredClients().slice(start, end);
    });

    // Estatisticas
    totalUsers = computed(() => this.filteredClients().length);
    totalActive = computed(() => 
        this.filteredClients().filter(u => u.status === "Active").length
    );
    totalInactive = computed(() => 
        this.filteredClients().filter(u => u.status === "Inactive").length
    );

    // Available roles for user management (client e admin)
    readonly availableRoles: UserRole[] = ["client", "admin"];

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

    // View Details
    viewingClient = signal<User | null>(null);

    // Delete Client
    deletingClient = signal<User | null>(null);

    // Reactivate Client
    reactivatingClient = signal<User | null>(null);

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

        // Validação de email duplicado
        const emailExists = this.dataService.users().some(u => 
            u.email.toLowerCase() === email.toLowerCase()
        );
        if (emailExists) {
            this.notificationService.addNotification(
                this.i18n.translate("emailAlreadyExists")
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

    // View Details
    viewClientDetails(client: User) {
        this.viewingClient.set(client);
    }

    closeDetails() {
        this.viewingClient.set(null);
    }

    // Delete Client (Soft Delete)
    confirmDeleteClient(client: User) {
        this.deletingClient.set(client);
    }

    async deleteClient() {
        const client = this.deletingClient();
        if (!client) return;

        try {
            // Exclusão lógica: atualiza status para 'Inactive'
            const { error } = await this.supabase.client
                .from("users")
                .update({ status: "Inactive" })
                .eq("id", client.id);

            if (error) {
                throw error;
            }

            this.notificationService.addNotification(
                this.i18n.translate("clientDeactivated", { name: client.name })
            );
            await this.dataService.fetchUsers();
            this.cancelDelete();
        } catch (error) {
            console.error("Error deleting client:", error);
            this.notificationService.addNotification(
                this.i18n.translate("errorDeletingClient")
            );
        }
    }

    cancelDelete() {
        this.deletingClient.set(null);
    }

    // Reactivate Client
    confirmReactivateClient(client: User) {
        this.reactivatingClient.set(client);
    }

    async reactivateClient() {
        const client = this.reactivatingClient();
        if (!client) return;

        try {
            const { error } = await this.supabase.client
                .from("users")
                .update({ status: "Active" })
                .eq("id", client.id);

            if (error) {
                throw error;
            }

            this.notificationService.addNotification(
                this.i18n.translate("clientActivated", { name: client.name })
            );
            await this.dataService.fetchUsers();
            this.cancelReactivate();
        } catch (error) {
            console.error("Error reactivating client:", error);
            this.notificationService.addNotification(
                this.i18n.translate("errorReactivatingClient")
            );
        }
    }

    cancelReactivate() {
        this.reactivatingClient.set(null);
    }

    // Pagination
    goToPage(page: number) {
        if (page >= 1 && page <= this.totalPages()) {
            this.currentPage.set(page);
        }
    }

    nextPage() {
        if (this.currentPage() < this.totalPages()) {
            this.currentPage.update(p => p + 1);
        }
    }

    previousPage() {
        if (this.currentPage() > 1) {
            this.currentPage.update(p => p - 1);
        }
    }

    changeItemsPerPage(items: number) {
        this.itemsPerPage.set(items);
        this.currentPage.set(1); // Reset para primeira página
    }

    // Filtros
    clearFilters() {
        this.searchTerm.set("");
        this.filterRole.set("all");
        this.filterStatus.set("all");
        this.currentPage.set(1);
    }

    // Helper para gerar array de páginas
    getPageNumbers(): number[] {
        const total = this.totalPages();
        const current = this.currentPage();
        const delta = 2; // Páginas antes e depois da atual
        const pages: number[] = [];

        for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
            pages.push(i);
        }

        if (current - delta > 2) {
            pages.unshift(-1); // Representa "..."
        }
        if (current + delta < total - 1) {
            pages.push(-1); // Representa "..."
        }

        pages.unshift(1);
        if (total > 1) {
            pages.push(total);
        }

        return pages;
    }
}
