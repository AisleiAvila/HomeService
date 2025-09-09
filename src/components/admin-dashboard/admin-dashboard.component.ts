import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { DataService } from "../../services/data.service";
import { I18nService } from "../../services/i18n.service";
import { NotificationService } from "../../services/notification.service";
import {
  User,
  ServiceCategory,
  ServiceRequest,
} from "../../models/maintenance.models";
import { I18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./admin-dashboard.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private dataService = inject(DataService);
  private i18n = inject(I18nService);
  private notificationService = inject(NotificationService);

  // Expose Math for template use
  Math = Math;

  constructor() {
    // Component initialized
  }

  // Environment check
  isProduction = false; // Could be injected from environment in production

  // UI State
  currentView = signal<
    | "overview"
    | "requests"
    | "approvals"
    | "finances"
    | "professionals"
    | "categories"
    | "clients"
  >("overview");
  showAddProfessionalForm = signal(false);
  editingCategory = signal<string | null>(null);
  editingCategoryName = signal("");

  // Form data
  newCategory = signal("");
  newProfessionalName = signal("");
  newProfessionalEmail = signal("");
  newProfessionalSpecialties = signal<string[]>([]);

  // Edit professional data
  editingProfessional = signal<User | null>(null);
  editingProfessionalName = signal("");
  editingProfessionalEmail = signal("");
  editingProfessionalSpecialties = signal<string[]>([]);

  // Quote and assignment data
  quoteRequest = signal<ServiceRequest | null>(null);
  quoteAmount = signal<number | null>(null);
  assignmentRequest = signal<ServiceRequest | null>(null);
  assigningProfessionalId = signal<number | null>(null);
  invoiceRequest = signal<ServiceRequest | null>(null);

  // Pagination data
  currentPage = signal(1);
  itemsPerPage = signal(5); // Changed to 5 to see pagination with fewer items
  totalPages = computed(() =>
    Math.ceil(this.allRequests().length / this.itemsPerPage())
  );

  // Computed property for paginated requests
  paginatedRequests = computed(() => {
    const requests = this.allRequests();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return requests.slice(start, end);
  });

  // Pagination helper methods
  get pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    // Show first page
    pages.push(1);

    // Show pages around current page
    let start = Math.max(2, current - 2);
    let end = Math.min(total - 1, current + 2);

    // Add ellipsis if needed
    if (start > 2) {
      pages.push(-1); // -1 represents ellipsis
    }

    // Add middle pages
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== total) {
        pages.push(i);
      }
    }

    // Add ellipsis if needed
    if (end < total - 1) {
      pages.push(-1); // -1 represents ellipsis
    }

    // Show last page if more than 1 page
    if (total > 1) {
      pages.push(total);
    }

    return pages;
  }

  // Data sources
  allUsers = this.dataService.users;
  allRequests = this.dataService.serviceRequests;
  allCategories = this.dataService.categories;

  // Computed properties for different views
  views = computed(() => [
    {
      id: "overview" as const,
      label: this.i18n.translate("overview"),
      icon: "fas fa-tachometer-alt",
    },
    {
      id: "requests" as const,
      label: this.i18n.translate("requests"),
      icon: "fas fa-list",
    },
    {
      id: "approvals" as const,
      label: this.i18n.translate("approvals"),
      icon: "fas fa-user-check",
    },
    {
      id: "finances" as const,
      label: this.i18n.translate("finances"),
      icon: "fas fa-chart-line",
    },
    {
      id: "professionals" as const,
      label: this.i18n.translate("professionals"),
      icon: "fas fa-users",
    },
    {
      id: "clients" as const,
      label: this.i18n.translate("clients"),
      icon: "fas fa-user-friends",
    },
    {
      id: "categories" as const,
      label: this.i18n.translate("categories"),
      icon: "fas fa-tags",
    },
  ]);

  pendingRegistrations = computed(() =>
    this.allUsers().filter(
      (u) => u.role === "professional" && u.status === "Pending"
    )
  );

  pendingApprovalCount = computed(() => this.pendingRegistrations().length);

  actionableRequests = computed(() =>
    this.allRequests().filter(
      (r) =>
        r.status === "Pending" ||
        r.status === "Quoted" ||
        r.status === "Approved"
    )
  );

  professionals = computed(() =>
    this.allUsers().filter(
      (u) => u.role === "professional" && u.status === "Active"
    )
  );

  clients = computed(() => this.allUsers().filter((u) => u.role === "client"));

  completedRequests = computed(() =>
    this.allRequests().filter((r) => r.status === "Completed" && r.cost)
  );

  financialStats = computed(() => {
    const completed = this.completedRequests();
    const totalRevenue = completed
      .filter((r) => r.payment_status === "Paid")
      .reduce((sum, r) => sum + (r.cost || 0), 0);

    const totalTax = totalRevenue * 0.07;
    const outstandingAmount = completed
      .filter((r) => r.payment_status === "Unpaid")
      .reduce((sum, r) => sum + (r.cost || 0), 0);

    return {
      completedServices: completed.length,
      totalRevenue,
      totalTax,
      outstandingAmount,
    };
  });

  stats = computed(() => {
    const requests = this.allRequests();
    const users = this.allUsers();
    const financialData = this.financialStats();

    return [
      {
        label: this.i18n.translate("totalRevenue"),
        value: this.formatCost(financialData.totalRevenue),
        icon: "fas fa-euro-sign",
        bgColor: "bg-green-100 text-green-600",
      },
      {
        label: this.i18n.translate("pendingApprovals"),
        value: this.pendingApprovalCount(),
        icon: "fas fa-user-clock",
        bgColor: "bg-orange-100 text-orange-600",
      },
      {
        label: this.i18n.translate("activeServices"),
        value: requests.filter((r) => r.status === "In Progress").length,
        icon: "fas fa-cogs",
        bgColor: "bg-blue-100 text-blue-600",
      },
      {
        label: this.i18n.translate("totalProfessionals"),
        value: users.filter(
          (u) => u.role === "professional" && u.status === "Active"
        ).length,
        icon: "fas fa-users-cog",
        bgColor: "bg-indigo-100 text-indigo-600",
      },
    ];
  });

  // Navigation methods
  setView(
    view:
      | "overview"
      | "requests"
      | "approvals"
      | "finances"
      | "professionals"
      | "categories"
      | "clients"
  ) {
    this.currentView.set(view);
  }

  // Pagination methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  previousPage() {
    const current = this.currentPage();
    if (current > 1) {
      this.currentPage.set(current - 1);
    }
  }

  nextPage() {
    const current = this.currentPage();
    if (current < this.totalPages()) {
      this.currentPage.set(current + 1);
    }
  }

  setItemsPerPage(items: number) {
    this.itemsPerPage.set(items);
    this.currentPage.set(1); // Reset to first page when changing items per page
  }

  // Helper methods
  getClientName(clientId: number): string {
    return (
      this.allUsers().find((u) => u.id === clientId)?.name ||
      this.i18n.translate("unknownClient")
    );
  }

  getProfessionalName(professionalId: number | null): string {
    if (!professionalId) return this.i18n.translate("unassigned");
    return (
      this.allUsers().find((u) => u.id === professionalId)?.name ||
      this.i18n.translate("unassigned")
    );
  }

  statusClass(status: string): string {
    const statusClasses = {
      Pending:
        "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800",
      Quoted:
        "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800",
      Approved:
        "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800",
      "In Progress":
        "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800",
      Completed:
        "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800",
      Cancelled:
        "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800",
    };
    return (
      statusClasses[status as keyof typeof statusClasses] ||
      "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800"
    );
  }

  formatCost(amount: number | null | undefined): string {
    if (!amount) return "N/A";
    return `€ ${amount.toFixed(2)}`;
  }

  // Approval methods
  approveClient(userId: number) {
    this.dataService.updateUser(userId, { status: "Active" });
    this.notificationService.addNotification(
      this.i18n.translate("professionalApproved", {
        name:
          this.allUsers().find((u) => u.id === userId)?.name || "Professional",
      })
    );
  }

  rejectClient(userId: number) {
    if (confirm(this.i18n.translate("confirmRejectRegistration"))) {
      this.dataService.updateUser(userId, { status: "Rejected" });
      this.notificationService.addNotification(
        this.i18n.translate("professionalRejected", {
          name:
            this.allUsers().find((u) => u.id === userId)?.name ||
            "Professional",
        })
      );
    }
  }

  // Quote methods
  selectRequestForQuote(request: ServiceRequest) {
    this.quoteRequest.set(request);
    this.quoteAmount.set(request.cost || null);
  }

  submitQuote() {
    const request = this.quoteRequest();
    const amount = this.quoteAmount();

    if (!request || !amount || amount <= 0) return;

    this.dataService.updateServiceRequest(request.id, {
      cost: amount,
      status: "Quoted",
    });

    this.notificationService.addNotification(
      this.i18n.translate("quoteSubmitted", { id: request.id.toString() })
    );

    this.quoteRequest.set(null);
    this.quoteAmount.set(null);
  }

  respondToQuote(requestId: number, approved: boolean) {
    const status = approved ? "Approved" : "Pending";
    this.dataService.updateServiceRequest(requestId, { status });

    this.notificationService.addNotification(
      approved
        ? this.i18n.translate("quoteApproved", { id: requestId.toString() })
        : this.i18n.translate("quoteRejected", { id: requestId.toString() })
    );
  }

  // Assignment methods
  selectRequestForAssignment(request: ServiceRequest) {
    this.assignmentRequest.set(request);
    this.assigningProfessionalId.set(null);
  }

  getProfessionalsForRequest(category: string): User[] {
    return this.professionals().filter(
      (p) => p.specialties?.includes(category) || !p.specialties?.length
    );
  }

  assignProfessional() {
    const request = this.assignmentRequest();
    const professionalId = this.assigningProfessionalId();

    if (!request || !professionalId) return;

    this.dataService.updateServiceRequest(request.id, {
      professional_id: professionalId,
      status: "Assigned",
    });

    this.notificationService.addNotification(
      this.i18n.translate("professionalAssigned", {
        id: request.id.toString(),
        professional: this.getProfessionalName(professionalId),
      })
    );

    this.assignmentRequest.set(null);
    this.assigningProfessionalId.set(null);
  }

  // Professional management
  toggleNewProfessionalSpecialty(category: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.newProfessionalSpecialties();

    if (checked) {
      this.newProfessionalSpecialties.set([...current, category]);
    } else {
      this.newProfessionalSpecialties.set(
        current.filter((s) => s !== category)
      );
    }
  }

  addProfessional() {
    const name = this.newProfessionalName().trim();
    const email = this.newProfessionalEmail().trim();
    const specialties = this.newProfessionalSpecialties();

    if (!name || !email) {
      this.notificationService.addNotification(
        this.i18n.translate("fillRequiredFields")
      );
      return;
    }

    // In a real app, this would call an API to create the professional
    this.notificationService.addNotification(
      this.i18n.translate("professionalAdded", { name })
    );

    this.resetNewProfessionalForm();
  }

  resetNewProfessionalForm() {
    this.showAddProfessionalForm.set(false);
    this.newProfessionalName.set("");
    this.newProfessionalEmail.set("");
    this.newProfessionalSpecialties.set([]);
  }

  startEditProfessional(professional: User) {
    this.editingProfessional.set(professional);
    this.editingProfessionalName.set(professional.name);
    this.editingProfessionalEmail.set(professional.email);
    this.editingProfessionalSpecialties.set(professional.specialties || []);
  }

  toggleEditProfessionalSpecialty(category: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.editingProfessionalSpecialties();

    if (checked) {
      this.editingProfessionalSpecialties.set([...current, category]);
    } else {
      this.editingProfessionalSpecialties.set(
        current.filter((s) => s !== category)
      );
    }
  }

  saveProfessionalEdit() {
    const professional = this.editingProfessional();
    if (!professional) return;

    const updates = {
      name: this.editingProfessionalName(),
      email: this.editingProfessionalEmail(),
      specialties: this.editingProfessionalSpecialties(),
    };

    this.dataService.updateUser(professional.id, updates);

    this.notificationService.addNotification(
      this.i18n.translate("professionalUpdated", { name: updates.name })
    );

    this.cancelEditProfessional();
  }

  cancelEditProfessional() {
    this.editingProfessional.set(null);
    this.editingProfessionalName.set("");
    this.editingProfessionalEmail.set("");
    this.editingProfessionalSpecialties.set([]);
  }

  // Category management
  startEditCategory(category: string) {
    this.editingCategory.set(category);
    this.editingCategoryName.set(category);
  }

  saveCategoryEdit() {
    const oldCategory = this.editingCategory();
    const newName = this.editingCategoryName().trim();

    if (!oldCategory || !newName || newName === oldCategory) {
      this.editingCategory.set(null);
      return;
    }

    if (this.allCategories().includes(newName)) {
      this.notificationService.addNotification(
        this.i18n.translate("categoryAlreadyExists")
      );
      return;
    }

    // Update category in the list
    this.allCategories.update((cats) =>
      cats.map((cat) => (cat === oldCategory ? newName : cat))
    );

    this.notificationService.addNotification(
      this.i18n.translate("categoryUpdated", { old: oldCategory, new: newName })
    );

    this.editingCategory.set(null);
    this.editingCategoryName.set("");
  }

  addCategory() {
    const cat = this.newCategory().trim();
    if (cat && !this.allCategories().includes(cat)) {
      this.allCategories.update((cats) => [...cats, cat]);
      this.newCategory.set("");
      this.notificationService.addNotification(
        this.i18n.translate("categoryAdded", { category: cat })
      );
    } else if (this.allCategories().includes(cat)) {
      this.notificationService.addNotification(
        this.i18n.translate("categoryAlreadyExists")
      );
    }
  }

  deleteCategory(categoryToDelete: ServiceCategory) {
    if (
      confirm(
        this.i18n.translate("confirmDeleteCategory", {
          category: categoryToDelete,
        })
      )
    ) {
      this.allCategories.update((cats) =>
        cats.filter((c) => c !== categoryToDelete)
      );
      this.notificationService.addNotification(
        this.i18n.translate("categoryDeleted", { category: categoryToDelete })
      );
    }
  }

  // Client management methods
  activateClient(userId: number) {
    this.dataService.updateUser(userId, { status: "Active" });
    this.notificationService.addNotification(
      this.i18n.translate("clientActivated", {
        name: this.allUsers().find((u) => u.id === userId)?.name || "Cliente",
      })
    );
  }

  deactivateClient(userId: number) {
    if (confirm(this.i18n.translate("confirmDeactivateClient"))) {
      this.dataService.updateUser(userId, { status: "Rejected" });
      this.notificationService.addNotification(
        this.i18n.translate("clientDeactivated", {
          name: this.allUsers().find((u) => u.id === userId)?.name || "Cliente",
        })
      );
    }
  }

  getClientStats(clientId: number) {
    const requests = this.allRequests().filter((r) => r.client_id === clientId);
    const completedRequests = requests.filter((r) => r.status === "Completed");
    const totalSpent = completedRequests.reduce(
      (sum, r) => sum + (r.cost || 0),
      0
    );

    return {
      totalRequests: requests.length,
      completedRequests: completedRequests.length,
      totalSpent: totalSpent,
      lastServiceDate:
        requests.length > 0
          ? Math.max(
              ...requests.map((r) => new Date(r.requested_date).getTime())
            )
          : null,
    };
  }

  // Financial methods
  exportToCSV() {
    this.exportFinancialsAsCSV();
  }

  generateInvoice(request: ServiceRequest) {
    this.invoiceRequest.set(request);
  }

  printInvoice() {
    window.print();
  }

  exportFinancialsAsCSV() {
    const completedRequests = this.completedRequests();
    if (completedRequests.length === 0) {
      this.notificationService.addNotification(
        this.i18n.translate("noDataToExport")
      );
      return;
    }

    const i18n = this.i18n;
    const headers = [
      i18n.translate("csvId"),
      i18n.translate("csvClient"),
      i18n.translate("csvProfessional"),
      i18n.translate("csvService"),
      i18n.translate("csvCompletionDate"),
      i18n.translate("csvPaymentStatus"),
      i18n.translate("csvBaseValue"),
      i18n.translate("csvTax"),
      i18n.translate("csvTotalValue"),
    ];

    const rows = completedRequests.map((r) => {
      const client = this.getClientName(r.client_id);
      const professional = this.getProfessionalName(r.professional_id);
      const tax = (r.cost || 0) * 0.07;
      const total = (r.cost || 0) + tax;

      return [
        r.id,
        client,
        professional,
        r.title,
        r.scheduled_date || r.requested_date,
        r.payment_status,
        (r.cost || 0).toFixed(2),
        tax.toFixed(2),
        total.toFixed(2),
      ].join(",");
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "financial_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.notificationService.addNotification(
      this.i18n.translate("reportExported")
    );
  }

  // Legacy methods for compatibility
  handleApproval(user: User, isApproved: boolean) {
    if (isApproved) {
      this.approveClient(user.id);
    } else {
      this.rejectClient(user.id);
    }
  }

  // Admin Dashboard specific actions
  viewRequestDetails(request: ServiceRequest) {
    console.log("Admin Dashboard - viewRequestDetails called:", request);
    // Emit to parent component to open modal
    // For now, we'll just log - the parent app component should handle this
    window.postMessage(
      {
        type: "OPEN_REQUEST_DETAILS",
        payload: request,
      },
      "*"
    );
  }

  openChat(request: ServiceRequest) {
    console.log("Admin Dashboard - openChat called:", request);
    // Emit to parent component to open chat
    window.postMessage(
      {
        type: "OPEN_CHAT",
        payload: request,
      },
      "*"
    );
  }

  // Computed properties for backward compatibility
  pendingProfessionals = this.pendingRegistrations;
  categories = this.allCategories;
}
