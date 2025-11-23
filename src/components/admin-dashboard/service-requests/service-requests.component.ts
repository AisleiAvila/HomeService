
import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal, ElementRef, ViewChildren, QueryList } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { ServiceRequest, User } from "../../../models/maintenance.models";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { DataService } from "../../../services/data.service";
import { I18nService } from "../../../i18n.service";
import { StatusService } from "@/src/services/status.service";

@Component({
    selector: "app-service-requests",
    standalone: true,
    imports: [CommonModule, FormsModule, I18nPipe],
    templateUrl: "./service-requests.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestsComponent {
    private readonly dataService = inject(DataService);
    private readonly i18n = inject(I18nService);
    private readonly router = inject(Router);

    // Signals for filters
    filterStatus = signal<string>("");
    filterStartDate = signal<string>("");
    filterEndDate = signal<string>("");
    filterDistrict = signal<string>("");
    filterProfessional = signal<string>("");
    searchTerm = signal<string>("");

    // Signals for sorting
    sortBy = signal<string>("date");
    sortOrder = signal<"asc" | "desc">("desc");

    // Pagination
    currentPage = signal(1);
    itemsPerPage = signal(5);

    // UI State
    openActionsMenuId = signal<number | null>(null);
    @ViewChildren("actionsMenu") actionsMenus!: QueryList<ElementRef>;

    // Options
    quickFilterOptions = [
        { status: "Solicitado", label: "statusRequested" },
        { status: "Em análise", label: "statusInAnalysis" },
        { status: "Agendado", label: "statusScheduled" },
        { status: "Finalizado", label: "statusCompleted" },
    ];

    districtOptions = [
        "Lisboa",
        "Porto",
        "Setúbal",
        "Braga",
        "Coimbra",
        "Aveiro",
    ];

    statusOptions = computed(() =>
        Object.values(StatusService).map((status) => ({
            value: status,
            label: this.i18n.translate(status),
        }))
    );

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

    getProfessionalName(profId: number | undefined): string {
        if (!profId) return 'N/A';
        return this.dataService.users().find(u => u.id === profId)?.name || 'N/A';
    }

    statusClass(status: string): string {
        // Implement status class logic or import from a shared utility if available
        // For now, copying basic logic or assuming it will be handled by a pipe/directive if refactored further
        // But since it was in the component, I'll replicate a basic version or check if I missed it in the read
        return ''; // Placeholder, need to check original component for this logic
    }

    // Action placeholders - these would need to emit events or call services
    analyzeRequest(req: ServiceRequest) { console.log('Analyze', req); }
    selectRequestForQuote(req: ServiceRequest) { console.log('Quote', req); }
    needsProfessionalAssignment(req: ServiceRequest): boolean { return false; } // Placeholder
    selectRequestForAssignment(req: ServiceRequest) { console.log('Assign', req); }
    openDirectAssignmentModal(req: ServiceRequest) { console.log('Direct Assign', req); }
    toggleActionsMenu(reqId: number) {
        this.openActionsMenuId.update(id => id === reqId ? null : reqId);
    }
    isActionsMenuOpen(reqId: number): boolean { return this.openActionsMenuId() === reqId; }
    viewRequestDetails(req: ServiceRequest) { console.log('View', req); }
    openChat(req: ServiceRequest) { console.log('Chat', req); }
    requestClarificationFromClient(req: ServiceRequest) { console.log('Clarify', req); }
}
