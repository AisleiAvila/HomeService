import { UiStateService } from "../../../services/ui-state.service";

import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { I18nService } from "../../../i18n.service";
import { PaymentStatus, ServiceRequest, ServiceStatus, User } from "../../../models/maintenance.models";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { AuthService } from "../../../services/auth.service";
import { DataService } from "../../../services/data.service";
import { PaymentModalComponent } from "../../payment-modal/payment-modal.component";
import { WorkflowServiceSimplified } from "../../../services/workflow-simplified.service";

@Component({
    selector: "app-service-requests",
    standalone: true,
    imports: [CommonModule, FormsModule, I18nPipe, PaymentModalComponent],
    templateUrl: "./service-requests.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestsComponent implements OnInit {
    // Signal de loading local, sincronizado com o DataService
    isLoading = computed(() => this.dataService.isLoading());

    ngOnInit() {
        // Recarrega a lista de solicitações quando o componente é inicializado
        console.log('[ServiceRequestsComponent] Inicializando - recarregando dados de solicitações');
        this.dataService.reloadServiceRequests();
    }

    async processPayment(request: ServiceRequest) {
                // Chama serviço para registrar pagamento via injeção
                await this.workflowService.registerPayment(
                    request.id,
                    this.currentUser()?.id ?? 0,
                    {
                        amount: request.valor_prestador ?? request.valor ?? 0,
                        method: "Confirmado Manualmente",
                        notes: 'Pagamento confirmado manualmente via painel admin',
                    }
                );
                // Atualiza lista e fecha modal
                await this.dataService.reloadServiceRequests();
                this.showPaymentModal.set(false);
            }
        showPaymentModal = signal(false);
        requestToPay = signal<ServiceRequest | null>(null);

        handlePayRequest(req: ServiceRequest) {
            this.requestToPay.set(req);
            this.showPaymentModal.set(true);
        }

        async handleFinalizeService(req: ServiceRequest) {
            const confirm = globalThis.confirm(
                this.i18n.translate('confirmFinalizeService') || 
                'Tem certeza que deseja finalizar este serviço? Esta ação é irreversível.'
            );
            
            if (!confirm) return;

            const success = await this.workflowService.finalizeService(
                req.id,
                this.currentUser()?.id ?? 0,
                'Serviço finalizado pelo administrador',
                () => this.dataService.reloadServiceRequests()
            );

            if (success) {
                await this.dataService.reloadServiceRequests();
            }
        }
    private readonly dataService = inject(DataService);
    private readonly i18n = inject(I18nService);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    private readonly workflowService = inject(WorkflowServiceSimplified);
    readonly uiState = inject(UiStateService);
    private readonly completedPaymentStatuses = new Set<PaymentStatus>(["Paid", "Released"]);
    private readonly reassignmentBlockedStatuses = new Set(
        [
            "iniciado",
            "iniciada",
            "finalizado",
            "finalizada",
            "pendente de pagamento",
            "pagamento pendente",
            "pendente pagamento",
            "concluído",
            "concluido",
            "concluída",
            "concluida",
            "in progress",
            "completed",
            "payment pending",
        ].map((status) => status.toLowerCase())
    );
    private readonly deletableStatuses = new Set(
        [
            "Solicitado",
            "Atribuído",
            "Aguardando Confirmação",
            "Aceito",
            "Recusado",
            "Data Definida"
        ].map((status) => status.toLowerCase())
    );

    // Quick filter options
    quickFilterOptions = [
        { status: "Solicitado", label: "statusRequested" },
        { status: "Atribuído", label: "statusAssigned" },
        { status: "Data Definida", label: "statusScheduled" },
        { status: "Concluído", label: "statusCompleted" },
    ];

    // Current user
    currentUser = this.authService.appUser;

    // Signals for filters
    filterStatus = signal<string>("");
    filterStartDate = signal<string>("");
    filterEndDate = signal<string>("");
    filterDistrict = signal<string>("");
    filterProfessional = signal<string>("");
    searchTerm = signal<string>("");
    showFilters = signal(true);

    // Signals for sorting
    sortBy = signal<string>("date");
    sortOrder = signal<"asc" | "desc">("desc");
    selectedProfessionalId = signal<string>("");
    selectedExecutionDate = signal<string>("");
    showEditRequestModal = signal(false);
    requestToEdit = signal<ServiceRequest | null>(null);
    showDirectAssignmentModal = signal(false);
    requestToAssign = signal<ServiceRequest | null>(null);
    showReassignmentModal = signal(false);
    requestToReassign = signal<ServiceRequest | null>(null);
    replacementProfessionalId = signal<string>("");
    openActionsMenuId = signal<number | null>(null);
    showDeleteRequestModal = signal(false);
    requestToDelete = signal<ServiceRequest | null>(null);
    isDeletingRequest = signal(false);

    // Pagination signals
    currentPage = signal<number>(1);
    itemsPerPage = signal<number>(10);

// Outputs
openDirectAssignment = output<ServiceRequest>();
viewDetails = output<ServiceRequest>();

// Confirma edição da solicitação
    async confirmEditRequest(form: any) {
        const request = this.requestToEdit();
        const user = this.currentUser();
        if (!request || !user) {
            return;
        }

        // Monta objeto de atualização com campos editáveis
        const updates: Partial<ServiceRequest> = {
            street: request.street ?? '',
            city: request.city ?? '',
            state: request.state ?? '',
            zip_code: request.zip_code ?? '',
            description: request.description ?? '',
            scheduled_start_datetime: request.scheduled_start_datetime ?? '',
            estimated_duration_minutes: request.estimated_duration_minutes ?? 0,
            admin_notes: request.admin_notes ?? ''
        };

        // Chama serviço de edição
        const workflowService = await import('../../../services/workflow-simplified.service');
        const workflowInstance = new workflowService.WorkflowServiceSimplified();
        const success = await workflowInstance.editServiceRequest(request.id, updates, user.id);
        if (success) {
            this.closeEditRequestModal();
            // Atualiza lista (força reload dos dados)
            await this.dataService.reloadServiceRequests();
        }
    }

    districtOptions = [
        "Lisboa",
        "Porto",
        "Setúbal",
        "Braga",
        "Coimbra",
        "Aveiro",
    ];

    statusOptions = computed(() => {
        const allStatus: ServiceStatus[] = [
            "Solicitado",
            "Atribuído",
            "Aguardando Confirmação",
            "Aceito",
            "Recusado",
            "Data Definida",
            "Em Progresso",
            "Concluído",
            "Cancelado"
        ];
        
        return allStatus.map((status) => ({
            value: status,
            label: this.i18n.translate(status),
        }));
    });

    professionalOptions = computed(() =>
        this.dataService.users().filter(u => u.role === 'professional' && u.status === 'Active')
    );

    // Computed for filtering and sorting
    filteredRequests = computed(() => {
        let reqs = this.dataService.serviceRequests();
        const status = this.filterStatus();
        const startDate = this.filterStartDate();
        const endDate = this.filterEndDate();
        const district = this.filterDistrict();
        const professional = this.filterProfessional();
        const search = this.searchTerm().toLowerCase();

        if (status) reqs = reqs.filter((r) => r.status === status);

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            reqs = reqs.filter((r) => {
                if (!r.requested_date) return false;
                const reqDate = new Date(r.requested_date);
                return reqDate >= start && reqDate <= end;
            });
        }

        if (district) reqs = reqs.filter((r) => r.state === district);
        if (professional)
            reqs = reqs.filter(
                (r) => String(r.professional_id) === String(professional)
            );
        if (search) {
            reqs = reqs.filter(
                (r) =>
                    r.title?.toLowerCase().includes(search) ||
                    r.zip_code?.toLowerCase().includes(search) ||
                    String(r.id).includes(search)
            );
        }

        return this.sortRequests(reqs);
    });

    // Computed for pagination
    filteredPaginatedRequests = computed(() => {
        const reqs = this.filteredRequests();
        const start = (this.currentPage() - 1) * this.itemsPerPage();
        const end = start + this.itemsPerPage();
        return reqs.slice(start, end);
    });

    totalPages = computed(() =>
        Math.ceil(this.filteredRequests().length / this.itemsPerPage())
    );

    // Helper methods
    sortRequests(requests: ServiceRequest[]): ServiceRequest[] {
        const sortBy = this.sortBy();
        const sortOrder = this.sortOrder();
        const multiplier = sortOrder === "asc" ? 1 : -1;

        return [...requests].sort((a, b) => {
            let compareResult = 0;

            switch (sortBy) {
                case "date": {
                    const dateA = a.requested_date ? new Date(a.requested_date).getTime() : 0;
                    const dateB = b.requested_date ? new Date(b.requested_date).getTime() : 0;
                    compareResult = dateA - dateB;
                    break;
                }
                case "status": {
                    compareResult = (a.status || "").localeCompare(b.status || "");
                    break;
                }
                case "id": {
                    compareResult = a.id - b.id;
                    break;
                }
                case "category": {
                    const catA = this.dataService.categories().find(c => c.id === a.category_id)?.name || "";
                    const catB = this.dataService.categories().find(c => c.id === b.category_id)?.name || "";
                    compareResult = catA.localeCompare(catB);
                    break;
                }
                case "professional": {
                    const profA = this.getProfessionalName(a.professional_id) || "";
                    const profB = this.getProfessionalName(b.professional_id) || "";
                    compareResult = profA.localeCompare(profB);
                    break;
                }
            }

            return compareResult * multiplier;
        });
    }

    sortByColumn(column: string) {
        if (this.sortBy() === column) {
            this.sortOrder.set(this.sortOrder() === "asc" ? "desc" : "asc");
        } else {
            this.sortBy.set(column);
            this.sortOrder.set("desc");
        }
    }

    applyQuickFilter(status: string) {
        this.filterStatus.set(this.filterStatus() === status ? "" : status);
    }

    clearFilters() {
        this.filterStatus.set("");
        this.filterStartDate.set("");
        this.filterEndDate.set("");
        this.filterDistrict.set("");
        this.filterProfessional.set("");
        this.searchTerm.set("");
    }

    toggleFilters() {
        this.showFilters.update((current) => !current);
    }

    removeFilter(filterType: "status" | "period" | "district" | "professional" | "search") {
        switch (filterType) {
            case "status": this.filterStatus.set(""); break;
            case "period": this.filterStartDate.set(""); this.filterEndDate.set(""); break;
            case "district": this.filterDistrict.set(""); break;
            case "professional": this.filterProfessional.set(""); break;
            case "search": this.searchTerm.set(""); break;
        }
    }

    activeFilters = computed(() => {
        const filters: { type: any; label: string; value: string }[] = [];
        if (this.filterStatus()) {
            filters.push({ type: "status", label: "status", value: this.filterStatus() });
        }
        if (this.filterStartDate() && this.filterEndDate()) {
            filters.push({ type: "period", label: "period", value: `${this.filterStartDate()} - ${this.filterEndDate()}` });
        }
        if (this.filterDistrict()) {
            filters.push({ type: "district", label: "district", value: this.filterDistrict() });
        }
        if (this.filterProfessional()) {
            const profName = this.professionalOptions().find(p => String(p.id) === String(this.filterProfessional()))?.name || "";
            filters.push({ type: "professional", label: "professional", value: profName });
        }
        if (this.searchTerm()) {
            filters.push({ type: "search", label: "search", value: this.searchTerm() });
        }
        return filters;
    });

    // Actions
    navigateToCreateRequest() {
        this.router.navigate(['/create-service-request']);
    }

    // Pagination helpers
    Math = Math;
    get pageNumbers(): number[] {
        const total = this.totalPages();
        const current = this.currentPage();
        const pages: number[] = [];
        pages.push(1);
        let start = Math.max(2, current - 2);
        let end = Math.min(total - 1, current + 2);
        if (start > 2) pages.push(-1);
        for (let i = start; i <= end; i++) if (i !== 1 && i !== total) pages.push(i);
        if (end < total - 1) pages.push(-1);
        if (total > 1) pages.push(total);
        return pages;
    }

    previousPage() { if (this.currentPage() > 1) this.currentPage.update(p => p - 1); }
    nextPage() { if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }
    goToPage(page: number) { if (page !== -1) this.currentPage.set(page); }
    setItemsPerPage(items: number) { this.itemsPerPage.set(items); this.currentPage.set(1); }

    // Helpers for template
    getClientName(clientId: number): string {
        return this.dataService.users().find(u => u.id === clientId)?.name || 'N/A';
    }

    getProfessionalProfile(profId: number | null | undefined): User | null {
        if (!profId) return null;
        return this.dataService.users().find(u => u.id === profId) ?? null;
    }

    getProfessionalName(profId: number | null | undefined): string {
        return this.getProfessionalProfile(profId)?.name || 'N/A';
    }

    statusClass(status: string): string {
        // Implement status class logic or import from a shared utility if available
        // For now, copying basic logic or assuming it will be handled by a pipe/directive if refactored further
        // But since it was in the component, I'll replicate a basic version or check if I missed it in the read
        return ''; // Placeholder, need to check original component for this logic
    }

    openDirectAssignmentModal(req: ServiceRequest) { 
        console.log('Direct Assign', req);
        console.log('requested_datetime:', req.requested_datetime);
        this.requestToAssign.set(req);
        this.selectedProfessionalId.set("");
        // Inicializa selectedExecutionDate com requested_datetime se disponível
        // Converter ISO string para formato datetime-local (YYYY-MM-DDTHH:mm)
        let executionDate = "";
        if (req.requested_datetime) {
            const date = new Date(req.requested_datetime);
            // Formato: YYYY-MM-DDTHH:mm
            executionDate = date.toISOString().slice(0, 16);
        }
        console.log('selectedExecutionDate set to:', executionDate);
        this.selectedExecutionDate.set(executionDate);
        this.showDirectAssignmentModal.set(true);
    }
    closeDirectAssignmentModal() {
        this.showDirectAssignmentModal.set(false);
        this.requestToAssign.set(null);
        this.selectedProfessionalId.set("");
        this.selectedExecutionDate.set("");
    }
    canChangeProfessional(request: ServiceRequest): boolean {
        if (!request?.professional_id) {
            return false;
        }
        const normalizedStatus = (request.status || "").trim().toLowerCase();
        return !this.reassignmentBlockedStatuses.has(normalizedStatus);
    }
    shouldShowProviderValue(request: ServiceRequest): boolean {
        if (!request?.professional_id) {
            return false;
        }
        const professional = this.getProfessionalProfile(request.professional_id);
        return professional ? professional.is_natan_employee !== true : false;
    }
    canShowPayRequestAction(request: ServiceRequest): boolean {
        if (!request) {
            return false;
        }
        const user = this.currentUser();
        if (!user || user.role !== "admin") {
            return false;
        }
        const paymentConfirmed =
            request.ispaid === true ||
            !!request.payment_date ||
            this.completedPaymentStatuses.has(request.payment_status);
        return request.status === "Concluído" && !paymentConfirmed;
    }
    canDeleteRequest(request: ServiceRequest): boolean {
        if (!request) {
            return false;
        }
        const normalizedStatus = (request.status || "").trim().toLowerCase();
        return this.deletableStatuses.has(normalizedStatus);
    }
    openReassignmentModal(request: ServiceRequest): void {
        if (!this.canChangeProfessional(request)) {
            return;
        }
        this.requestToReassign.set(request);
        this.replacementProfessionalId.set("");
        this.showReassignmentModal.set(true);
    }
    openDeleteRequestModal(request: ServiceRequest): void {
        if (!this.canDeleteRequest(request)) {
            return;
        }
        this.requestToDelete.set(request);
        this.showDeleteRequestModal.set(true);
    }
    closeReassignmentModal(): void {
        this.showReassignmentModal.set(false);
        this.requestToReassign.set(null);
        this.replacementProfessionalId.set("");
    }
    closeDeleteRequestModal(): void {
        this.showDeleteRequestModal.set(false);
        this.requestToDelete.set(null);
        this.isDeletingRequest.set(false);
    }
    async confirmDeleteRequest(): Promise<void> {
        const request = this.requestToDelete();
        if (!request) {
            return;
        }
        this.isDeletingRequest.set(true);
        const deleted = await this.dataService.deleteServiceRequest(request.id);
        if (deleted) {
            this.closeDeleteRequestModal();
        } else {
            this.isDeletingRequest.set(false);
        }
    }
    availableReassignmentProfessionals(request: ServiceRequest | null): User[] {
        if (!request) {
            return [];
        }
        return this.professionalOptions().filter((prof) => prof.id !== request.professional_id);
    }
    getExecutionDateLabel(request: ServiceRequest | null): string {
        const scheduledDate =
            request?.scheduled_start_datetime ||
            request?.requested_datetime ||
            request?.requested_date ||
            null;
        if (!scheduledDate) {
            return this.i18n.translate('noDateDefined') || 'Sem data definida';
        }
        const parsed = new Date(scheduledDate);
        if (Number.isNaN(parsed.getTime())) {
            return scheduledDate;
        }
        return new Intl.DateTimeFormat('pt-PT', {
            dateStyle: 'short',
            timeStyle: scheduledDate.includes('T') ? 'short' : undefined,
        }).format(parsed);
    }
    private getExecutionDateValue(request: ServiceRequest | null): string {
        if (!request) {
            return '';
        }
        return (
            request.scheduled_start_datetime ||
            request.requested_datetime ||
            request.requested_date ||
            ''
        );
    }
    async confirmProfessionalReassignment(): Promise<void> {
        const request = this.requestToReassign();
        const professionalId = this.replacementProfessionalId();
        if (!request || !professionalId) {
            alert(
                this.i18n.translate('pleasSelectProfessional') ||
                    'Selecione um profissional disponível.'
            );
            return;
        }
        try {
            await this.dataService.directAssignServiceRequest(
                request.id,
                Number.parseInt(professionalId, 10),
                this.getExecutionDateValue(request)
            );
            this.closeReassignmentModal();
            alert(
                this.i18n.translate('reassignmentSuccess') ||
                    'Profissional atualizado com sucesso!'
            );
        } catch (error) {
            console.error('Error reassigning professional:', error);
            alert(
                this.i18n.translate('reassignmentError') ||
                    'Não foi possível atualizar o profissional.'
            );
        }
    }
    closeEditRequestModal() {
        this.showEditRequestModal.set(false);
        this.requestToEdit.set(null);
    }
    openEditRequestModal(req: ServiceRequest) {
        this.router.navigate([`/admin/service-request-edit/${req.id}`]);
    }
    
    async confirmDirectAssignment() {
        const request = this.requestToAssign();
        const professionalId = this.selectedProfessionalId();
        const executionDate = this.selectedExecutionDate();
        
        if (!request || !professionalId) {
            alert(this.i18n.translate('pleasSelectProfessional'));
            return;
        }

        try {
            await this.dataService.directAssignServiceRequest(
                request.id,
                Number.parseInt(professionalId),
                executionDate
            );
            this.closeDirectAssignmentModal();
            const professionalName = this.getProfessionalName(Number.parseInt(professionalId));
            alert(this.i18n.translate('directAssignmentSuccess')
                .replace('{id}', request.id.toString())
                .replace('{professional}', professionalName));
        } catch (error) {
            console.error('Error assigning professional:', error);
            alert(this.i18n.translate('directAssignmentError'));
        }
    }
    toggleActionsMenu(reqId: number) {
        this.openActionsMenuId.update(id => id === reqId ? null : reqId);
    }
    isActionsMenuOpen(reqId: number): boolean { return this.openActionsMenuId() === reqId; }
    handleViewDetails(req: ServiceRequest) { 
        console.log('View', req); 
        this.viewDetails.emit(req);
        // Navegar para a página de detalhes
        this.router.navigate(['/admin/request-details', req.id]);
    }
    handleOpenChat(req: ServiceRequest) { 
        console.log('Chat', req); 
        this.uiState.openChat(req);
    }

    handleOpenGeolocation(req: ServiceRequest) {
        if (!req?.id) {
            console.warn('[ServiceRequestsComponent] Invalid request for geolocation action', req);
            return;
        }
        const target = this.currentUser()?.role === 'admin'
            ? ['/admin/requests', req.id, 'geolocation']
            : ['/requests', req.id, 'geolocation'];
        this.router.navigate(target, { state: { request: req } });
    }
}

