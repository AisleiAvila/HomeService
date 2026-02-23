import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { User, UserRole, ServiceCategory, Warehouse } from "../../../models/maintenance.models";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { DataService } from "../../../services/data.service";
import { I18nService } from "../../../i18n.service";
import { NotificationService } from "../../../services/notification.service";
import { SupabaseService } from "../../../services/supabase.service";
import { AccessibleTenant, AuthService, SuperUserAccount, SuperUserAuditEntry } from "../../../services/auth.service";
import { WarehouseService } from "../../../services/warehouse.service";
import { UserWarehousesService } from "../../../services/user-warehouses.service";

@Component({
    selector: "app-users-management",
    standalone: true,
    imports: [CommonModule, FormsModule, I18nPipe],
    templateUrl: "./users-management.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersManagementComponent implements OnInit {
    private readonly dataService = inject(DataService);
    private readonly i18n = inject(I18nService);
    private readonly notificationService = inject(NotificationService);
    private readonly supabase = inject(SupabaseService);
    private readonly authService = inject(AuthService);
    private readonly warehouseService = inject(WarehouseService);
    private readonly userWarehousesService = inject(UserWarehousesService);

    ngOnInit() {
        console.log('[UsersManagementComponent] Inicializando - recarregando dados de usuários');
        this.dataService.reloadUsers();
        // Garante que as categorias estejam carregadas para especialidades
        this.dataService.fetchCategories();

        // Admin needs full warehouses list for assignment UI
        this.warehouseService.fetchWarehouses();
    }


    // Computed para acessar categorias igual à tela de profissionais
    categories = computed(() => this.dataService.categories());
    readonly Math = Math;

    // Filtros e Busca
    searchTerm = signal("");
    filterRole = signal<UserRole | "all">("all");
    filterStatus = signal<"all" | "Active" | "Inactive" | "Pending" | "Rejected">("all");
    filterSpecialty = signal<number | "all">("all");
    filterModality = signal<"all" | "contracted" | "service_provider">("all");

    // Ordenação
    sortColumn = signal<'name' | 'email' | 'role' | 'status'>('name');
    sortDirection = signal<'asc' | 'desc'>('asc');

    setSort(column: 'name' | 'email' | 'role' | 'status') {
        if (this.sortColumn() === column) {
            this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
        } else {
            this.sortColumn.set(column);
            this.sortDirection.set('asc');
        }
    }

    // Paginação
    pageSize = 10;
    currentPage = signal(1);

    // Lista filtrada (only professional and admin - client role removed)
    filteredClients = computed(() => {
        let users = this.dataService.users()
            .filter((u) =>
                u.role === "professional" ||
                u.role === "professional_almoxarife" ||
                u.role === "almoxarife" ||
                u.role === "secretario" ||
                u.role === "admin" ||
                u.role === "super_user"
            );

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

        // Aplicar filtro de especialidade
        const specialty = this.filterSpecialty();
        if (specialty !== "all") {
            users = users.filter(u => (u.specialties ?? []).some(cat => cat.id === specialty));
        }

        // Aplicar filtro de modalidade
        const modality = this.filterModality();
        if (modality !== "all") {
            if (modality === "contracted") {
                users = users.filter(u => this.isProfessionalLikeRole(u.role) && u.is_natan_employee === true);
            } else if (modality === "service_provider") {
                users = users.filter(u => this.isProfessionalLikeRole(u.role) && u.is_natan_employee === false);
            }
        }

        // Aplicar ordenação
        const sortCol = this.sortColumn();
        const sortDir = this.sortDirection();
        users = users.slice(); // Defensive copy
        users.sort((a, b) => {
            let aVal: string, bVal: string;
            if (sortCol === 'name') {
                aVal = a.name?.toLowerCase() || '';
                bVal = b.name?.toLowerCase() || '';
            } else if (sortCol === 'email') {
                aVal = a.email?.toLowerCase() || '';
                bVal = b.email?.toLowerCase() || '';
            } else if (sortCol === 'role') {
                aVal = a.role?.toLowerCase() || '';
                bVal = b.role?.toLowerCase() || '';
            } else if (sortCol === 'status') {
                aVal = a.status?.toLowerCase() || '';
                bVal = b.status?.toLowerCase() || '';
            } else {
                return 0;
            }
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return users;
    });

    // Total de páginas
    totalPages = computed(() => 
        Math.ceil(this.filteredClients().length / this.pageSize)
    );

    // Usuários da página atual
    clients = computed(() => {
        const start = (this.currentPage() - 1) * this.pageSize;
        const end = start + this.pageSize;
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
    totalProfessionals = computed(() => 
        this.filteredClients().filter(u => u.role === "professional" || u.role === "professional_almoxarife").length
    );
    totalContractedProfessionals = computed(() => 
        this.filteredClients().filter(u => this.isProfessionalLikeRole(u.role) && u.is_natan_employee === true).length
    );
    totalServiceProviderProfessionals = computed(() => 
        this.filteredClients().filter(u => this.isProfessionalLikeRole(u.role) && u.is_natan_employee === false).length
    );

    // Effect para resetar página quando filtros mudarem
    constructor() {
        effect(() => {
            // Observa mudanças nos filtros e ordenação
            this.searchTerm();
            this.filterRole();
            this.filterStatus();
            this.filterSpecialty();
            this.sortColumn();
            this.sortDirection();
            // Reseta para a primeira página
            this.currentPage.set(1);
        });

        effect(() => {
            if (this.canManageSuperUserAccess()) {
                void this.loadSuperUserAccessData();
            } else {
                this.resetSuperUserAccessState();
            }
        });
    }

    // Available roles for user management (only professional and admin - client role removed)
    readonly availableRoles: UserRole[] = [
        "professional",
        "almoxarife",
        "secretario",
        "professional_almoxarife",
        "admin",
        "super_user",
    ];

    readonly warehouses = computed(() => this.warehouseService.warehouses());

    isStockRole(role: UserRole): boolean {
        return role === "almoxarife" || role === "professional_almoxarife";
    }

    isProfessionalLikeRole(role: UserRole): boolean {
        return role === "professional" || role === "professional_almoxarife";
    }

    // Add Client Form
    showAddClientForm = signal(false);
    newClientName = signal("");
    newClientEmail = signal("");
    newClientPhone = signal("");
    newClientRole = signal<UserRole>("professional");
    newClientIsNatanEmployee = signal(false);
    // Especialidades selecionadas ao adicionar novo usuário
    newClientSpecialties = signal<ServiceCategory[]>([]);

    // Edit Client
    editingClient = signal<User | null>(null);
    editingClientName = signal("");
    editingClientEmail = signal("");
    editingClientRole = signal<UserRole>("professional");
    editingClientIsNatanEmployee = signal(false);
    editingClientSpecialties = signal<ServiceCategory[]>([]);
    editingClientWarehouseIds = signal<number[]>([]);

    // View Details
    viewingClient = signal<User | null>(null);

    // Delete Client
    deletingClient = signal<User | null>(null);

    // Reactivate Client
    reactivatingClient = signal<User | null>(null);

    // Super User Tenant Access Management
    superUsers = signal<SuperUserAccount[]>([]);
    availableTenants = signal<AccessibleTenant[]>([]);
    selectedSuperUserId = signal<number | null>(null);
    selectedSuperUserTenantIds = signal<string[]>([]);
    superUserAuditEntries = signal<SuperUserAuditEntry[]>([]);
    superUserAccessReason = signal("");
    superUserLoading = signal(false);
    superUserActionBusy = signal(false);
    superUserAuditLoading = signal(false);

    canManageSuperUserAccess = computed(() => this.authService.appUser()?.role === "super_user");
    selectedSuperUser = computed(() => {
        const selectedId = this.selectedSuperUserId();
        if (!selectedId) {
            return null;
        }
        return this.superUsers().find((user) => Number(user.id) === selectedId) ?? null;
    });

    toggleAddClientForm() {
        this.showAddClientForm.update((v) => !v);
    }

    private resetSuperUserAccessState() {
        this.superUsers.set([]);
        this.availableTenants.set([]);
        this.selectedSuperUserId.set(null);
        this.selectedSuperUserTenantIds.set([]);
        this.superUserAuditEntries.set([]);
        this.superUserAccessReason.set("");
        this.superUserLoading.set(false);
        this.superUserActionBusy.set(false);
        this.superUserAuditLoading.set(false);
    }

    async loadSuperUserAccessData() {
        this.superUserLoading.set(true);
        try {
            const [users, tenants] = await Promise.all([
                this.authService.listSuperUsers(),
                this.authService.listAccessibleTenants(),
            ]);

            this.superUsers.set(users);
            this.availableTenants.set(tenants);

            const selectedId = this.selectedSuperUserId();
            const hasSelected = selectedId ? users.some((user) => Number(user.id) === selectedId) : false;
            if (!hasSelected) {
                const firstId = users.length > 0 ? Number(users[0].id) : null;
                this.selectedSuperUserId.set(firstId);
            }

            if (this.selectedSuperUserId()) {
                await Promise.all([
                    this.loadSelectedSuperUserTenantAccess(),
                    this.loadSelectedSuperUserAudit(),
                ]);
            } else {
                this.selectedSuperUserTenantIds.set([]);
                this.superUserAuditEntries.set([]);
            }
        } catch (error) {
            console.error("[UsersManagementComponent] Error loading super user access data:", error);
            this.notificationService.addNotification("Falha ao carregar dados de acesso de super usuários");
        } finally {
            this.superUserLoading.set(false);
        }
    }

    async onSuperUserSelectionChange(rawValue: string | number) {
        const userId = Number(rawValue);
        if (!Number.isFinite(userId)) {
            this.selectedSuperUserId.set(null);
            this.selectedSuperUserTenantIds.set([]);
            return;
        }

        this.selectedSuperUserId.set(userId);
        await Promise.all([
            this.loadSelectedSuperUserTenantAccess(),
            this.loadSelectedSuperUserAudit(),
        ]);
    }

    async loadSelectedSuperUserTenantAccess() {
        const selectedId = this.selectedSuperUserId();
        if (!selectedId) {
            this.selectedSuperUserTenantIds.set([]);
            return;
        }

        try {
            const tenantIds = await this.authService.getSuperUserTenantAccess(selectedId);
            this.selectedSuperUserTenantIds.set(tenantIds);
        } catch (error) {
            console.error("[UsersManagementComponent] Error loading selected super user tenants:", error);
            this.notificationService.addNotification("Falha ao carregar tenants atribuídos ao super usuário");
            this.selectedSuperUserTenantIds.set([]);
        }
    }

    async loadSelectedSuperUserAudit() {
        const selectedId = this.selectedSuperUserId();
        if (!selectedId) {
            this.superUserAuditEntries.set([]);
            return;
        }

        this.superUserAuditLoading.set(true);
        try {
            const logs = await this.authService.listSuperUserAudit(selectedId, 30);
            this.superUserAuditEntries.set(logs);
        } catch (error) {
            console.error("[UsersManagementComponent] Error loading super user audit:", error);
            this.superUserAuditEntries.set([]);
        } finally {
            this.superUserAuditLoading.set(false);
        }
    }

    isSuperUserTenantGranted(tenantId: string): boolean {
        return this.selectedSuperUserTenantIds().includes(tenantId);
    }

    async onSuperUserTenantToggle(tenantId: string, event: Event) {
        const selectedId = this.selectedSuperUserId();
        if (!selectedId) {
            this.notificationService.addNotification("Selecione um super usuário antes de alterar acessos");
            return;
        }

        const isChecked = (event.target as HTMLInputElement).checked;
        this.superUserActionBusy.set(true);
        try {
            const reason = this.superUserAccessReason().trim() || undefined;
            const success = isChecked
                ? await this.authService.grantSuperUserTenantAccess(selectedId, tenantId, reason)
                : await this.authService.revokeSuperUserTenantAccess(selectedId, tenantId, reason);

            if (!success) {
                this.notificationService.addNotification("Não foi possível atualizar o acesso do super usuário");
            }

            await Promise.all([
                this.loadSelectedSuperUserTenantAccess(),
                this.loadSelectedSuperUserAudit(),
            ]);
        } catch (error) {
            console.error("[UsersManagementComponent] Error changing super user tenant access:", error);
            this.notificationService.addNotification("Erro ao atualizar acesso de tenant");
            await Promise.all([
                this.loadSelectedSuperUserTenantAccess(),
                this.loadSelectedSuperUserAudit(),
            ]);
        } finally {
            this.superUserActionBusy.set(false);
        }
    }

    resetNewClientForm() {
        this.newClientName.set("");
        this.newClientEmail.set("");
        this.newClientPhone.set("");
        this.newClientRole.set("professional");
        this.newClientIsNatanEmployee.set(false);
        this.showAddClientForm.set(false);
    }

    async addClient() {
        const name = this.newClientName();
        const email = this.newClientEmail();
        const phone = this.newClientPhone();
        const role = this.newClientRole();

        if (!name || !email || !phone || !role) {
            this.notificationService.addNotification(
                this.i18n.translate("fillRequiredFields")
            );
            return;
        }

        // Validação do formato do telefone português (+351 seguido de 9 dígitos)
        // Remove espaços, hífens e outros caracteres não numéricos (exceto +)
        const cleanPhone = phone.replaceAll(/[\s-]/g, '');
        const phoneRegex = /^\+?351?9[1236]\d{7}$/;
        if (!phoneRegex.test(cleanPhone)) {
            this.notificationService.addNotification(
                this.i18n.translate("phoneInvalidPortugal")
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
            const confirmLink = `https://natan-general-service.vercel.app/confirmar-email?email=${encodeURIComponent(email)}&token=${token}`;
            const html = `<p>Olá ${name},</p>
                <p>Seu cadastro como ${role === 'admin' ? 'administrador' : 'usuário'} foi realizado com sucesso.<br>
                Use a senha temporária abaixo para acessar o sistema pela primeira vez:<br>
                <b>${tempPassword}</b></p>
                <p>Antes de acessar, confirme seu e-mail clicando no link abaixo:</p>
                <p><a href='${confirmLink}'>Confirmar e-mail</a></p>
                <p>Após o primeiro login, você será redirecionado para definir uma nova senha.</p>`;

            // 4. Cria usuário via backend customizado
            // Extrai o telefone formatado para Portugal
            let formattedPhone: string;
            if (cleanPhone.startsWith('+351')) {
                formattedPhone = cleanPhone;
            } else if (cleanPhone.startsWith('351')) {
                formattedPhone = `+${cleanPhone}`;
            } else {
                formattedPhone = `+351${cleanPhone}`;
            }

            const res = await fetch('http://localhost:4002/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    phone: formattedPhone,
                    specialty: '', // Administradores não têm especialidade
                    role,
                    status: 'Active', // Administradores já são ativados
                    confirmation_token: token,
                    password: tempPassword,
                    is_natan_employee: this.newClientIsNatanEmployee()
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
                subject: 'Confirmação de cadastro - Natan General Service',
                html,
                token,
                tempPassword
            });

            await fetch('http://localhost:4001/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    subject: 'Confirmação de cadastro - Natan General Service',
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
        this.editingClientIsNatanEmployee.set(client.is_natan_employee ?? false);
        this.editingClientSpecialties.set(client.specialties || []);
        this.editingClientWarehouseIds.set([]);
        console.log('[Editar Usuário] Papel:', client.role, '| editingClientRole:', this.editingClientRole());

        // Load warehouse assignments for editing (best-effort)
        this.userWarehousesService
            .fetchWarehouseIdsForUser(client.id)
            .then((ids) => this.editingClientWarehouseIds.set(ids))
            .catch((err) => console.error('[UsersManagementComponent] Error loading user warehouses:', err));
    }

    isEditingSpecialtySelected(category: ServiceCategory): boolean {
        return this.editingClientSpecialties().some((c) => c.id === category.id);
    }

    onEditingSpecialtyToggle(category: ServiceCategory, event: Event) {
        const isChecked = (event.target as HTMLInputElement).checked;
        const current = this.editingClientSpecialties();
        
        if (isChecked) {
            // Adiciona a especialidade
            if (!current.some(c => c.id === category.id)) {
                this.editingClientSpecialties.set([...current, category]);
            }
        } else {
            // Remove a especialidade
            this.editingClientSpecialties.set(current.filter(c => c.id !== category.id));
        }
    }

    private async updateClientBasicData(clientId: number, name: string, email: string, role: UserRole): Promise<void> {
        const updateData: any = { name, email, role };
        if (this.isProfessionalLikeRole(role)) {
            updateData.is_natan_employee = this.editingClientIsNatanEmployee();
        }

        const { error } = await this.supabase.client
            .from("users")
            .update(updateData)
            .eq("id", clientId);

        if (error) {
            throw error;
        }
    }

    private async clearClientSpecialties(clientId: number, throwOnError: boolean): Promise<void> {
        const { error: deleteError } = await this.supabase.client
            .from("user_specialties")
            .delete()
            .eq("user_id", clientId);

        if (deleteError) {
            console.error("Error deleting specialties:", deleteError);
            if (throwOnError) {
                throw deleteError;
            }
        }
    }

    private async insertClientSpecialties(clientId: number): Promise<void> {
        const specialtiesToInsert = this.editingClientSpecialties().map(category => ({
            user_id: clientId,
            category_id: category.id
        }));

        if (specialtiesToInsert.length === 0) {
            return;
        }

        const { error: insertError } = await this.supabase.client
            .from("user_specialties")
            .insert(specialtiesToInsert);

        if (insertError) {
            console.error("Error inserting specialties:", insertError);
            throw insertError;
        }
    }

    private async syncClientSpecialties(clientId: number, role: UserRole): Promise<void> {
        if (this.isProfessionalLikeRole(role)) {
            await this.clearClientSpecialties(clientId, true);
            await this.insertClientSpecialties(clientId);
            return;
        }

        await this.clearClientSpecialties(clientId, false);
    }

    private async syncClientWarehouses(clientId: number, role: UserRole): Promise<void> {
        if (this.isStockRole(role)) {
            await this.userWarehousesService.setWarehousesForUser(clientId, this.editingClientWarehouseIds());
            return;
        }

        await this.userWarehousesService.setWarehousesForUser(clientId, []);
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
            await this.updateClientBasicData(client.id, name, email, role);
            await this.syncClientSpecialties(client.id, role);
            await this.syncClientWarehouses(client.id, role);

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
        this.editingClientRole.set("professional");
        this.editingClientIsNatanEmployee.set(false);
        this.editingClientSpecialties.set([]);
        this.editingClientWarehouseIds.set([]);
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

    isNewSpecialtySelected(category: ServiceCategory): boolean {
        return this.newClientSpecialties().some((c) => c.id === category.id);
    }

    onNewSpecialtyToggle(category: ServiceCategory, event: Event) {
        const isChecked = (event.target as HTMLInputElement).checked;
        const current = this.newClientSpecialties();
        if (isChecked) {
            if (!current.some(c => c.id === category.id)) {
                this.newClientSpecialties.set([...current, category]);
            }
        } else {
            this.newClientSpecialties.set(current.filter(c => c.id !== category.id));
        }
    }

    getProfessionalSpecialties(user: User | null): ServiceCategory[] {
        if (!user || !this.isProfessionalLikeRole(user.role)) {
            return [];
        }
        return (user.specialties ?? []).filter((category): category is ServiceCategory => !!category?.name);
    }

    isEditingWarehouseSelected(warehouse: Warehouse): boolean {
        return this.editingClientWarehouseIds().includes(warehouse.id);
    }

    onEditingWarehouseToggle(warehouse: Warehouse, event: Event) {
        const isChecked = (event.target as HTMLInputElement).checked;
        const current = this.editingClientWarehouseIds();
        if (isChecked) {
            if (!current.includes(warehouse.id)) {
                this.editingClientWarehouseIds.set([...current, warehouse.id]);
            }
        } else {
            this.editingClientWarehouseIds.set(current.filter((id) => id !== warehouse.id));
        }
    }

    // Pagination
    nextPage() {
        if (this.currentPage() < this.totalPages()) {
            this.currentPage.update(p => p + 1);
        }
    }

    prevPage() {
        if (this.currentPage() > 1) {
            this.currentPage.update(p => p - 1);
        }
    }

    // Filtros
    clearFilters() {
        this.searchTerm.set("");
        this.filterRole.set("all");
        this.filterStatus.set("all");
        this.filterSpecialty.set("all");
        this.filterModality.set("all");
        this.currentPage.set(1);
    }
}

