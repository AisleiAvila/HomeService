
import { CommonModule } from "@angular/common";
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from "@angular/core";
import { I18nService } from "../../../i18n.service";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { DataService } from "../../../services/data.service";
import { ServiceRequest, User, ServiceCategory } from "../../../models/maintenance.models";
import { NotificationService } from "../../../services/notification.service";

type ProfessionalFilterValue = number | "unassigned" | null;
type EmploymentFilterValue = "all" | "employee" | "independent";
type SortColumn = "professional" | "category" | "serviceValue" | "paidAmount" | "pendingAmount" | "finalAmount";
type FinancialBreakdownKey = "serviceValue" | "paidProviders" | "unpaidProviders";
type FinancialBreakdownItem = {
    key: FinancialBreakdownKey;
    label: string;
    value: number;
    percentage: number;
    colorClass: string;
    color: string;
};

@Component({
    selector: "app-financial-reports",
    standalone: true,
    imports: [CommonModule, I18nPipe],
    templateUrl: "./financial-reports.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialReportsComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly dataService = inject(DataService);
    private readonly i18n = inject(I18nService);
    private readonly notificationService = inject(NotificationService);

    private readonly usersById = computed(() => {
        const map = new Map<number, User>();
        this.dataService
            .users()
            .forEach((user) => {
                if (user?.id !== undefined && user?.id !== null) {
                    map.set(user.id, user);
                }
            });
        return map;
    });

    private readonly categoriesById = computed(() => {
        const map = new Map<number, ServiceCategory>();
        this.dataService
            .categories()
            .forEach((category) => {
                if (category?.id !== undefined && category?.id !== null) {
                    map.set(category.id, category);
                }
            });
        return map;
    });

    readonly availableCategories = computed(() => this.dataService.categories());
    readonly availableProfessionals = computed(() =>
        this.dataService
            .users()
            .filter((user) => user.role === "professional")
    );

    readonly categoryFilter = signal<number | null>(null);
    readonly professionalFilter = signal<ProfessionalFilterValue>(null);
    readonly employmentFilter = signal<EmploymentFilterValue>("all");
    readonly startDateFilter = signal<string | null>(null);
    readonly endDateFilter = signal<string | null>(null);
    readonly sortBy = signal<SortColumn>("professional");
    readonly sortOrder = signal<"asc" | "desc">("asc");
    readonly currentPage = signal<number>(1);
    readonly itemsPerPage = signal<number>(10);
    readonly Math = Math;
    readonly filtersExpanded = signal<boolean>(true);
    readonly chartsExpanded = signal<boolean>(true);
    private readonly financialColorStyles: Record<FinancialBreakdownKey, { className: string; color: string }> = {
        serviceValue: { className: "bg-brand-primary-500", color: "#2563eb" },
        paidProviders: { className: "bg-emerald-500", color: "#10b981" },
        unpaidProviders: { className: "bg-orange-500", color: "#f97316" },
    };
    private readonly statusColorStyles: Record<string, string> = {
        Solicitado: "#ef4444",
        Requested: "#ef4444",
        "Atribuído": "#f97316",
        Assigned: "#f97316",
        "Aguardando Confirmação": "#8b5cf6",
        "Waiting Confirmation": "#8b5cf6",
        Aceito: "#0ea5e9",
        Accepted: "#0ea5e9",
        Recusado: "#f87171",
        Refused: "#f87171",
        "Data Definida": "#0ea5e9",
        Scheduled: "#0ea5e9",
        "Em Progresso": "#9333ea",
        "In Progress": "#9333ea",
        "Aguardando Finalização": "#64748b",
        "Awaiting Finish": "#64748b",
        "Pagamento Feito": "#22c55e",
        "Payment Done": "#22c55e",
        "Concluído": "#14b8a6",
        Completed: "#14b8a6",
        "Cancelado": "#dc2626",
        Cancelled: "#dc2626",
        Unknown: "#94a3b8",
    };
    private hasInitializedFinancialChart = false;
    private hasInitializedServiceStatusChart = false;
    private readonly handleResize = () => {
        this.scheduleFinancialTotalsRender();
        this.scheduleServiceStatusRender();
        if (globalThis.window !== undefined && globalThis.window.innerWidth >= 1024 && !this.filtersExpanded()) {
            this.filtersExpanded.set(true);
        }
    };

    @ViewChild("financialTotalsCanvas") private readonly financialTotalsCanvas?: ElementRef<HTMLCanvasElement>;
    @ViewChild("serviceStatusCanvas") private readonly serviceStatusCanvas?: ElementRef<HTMLCanvasElement>;

    ngOnInit() {
        console.log('[FinancialReportsComponent] Inicializando - recarregando dados de solicitações');
        this.dataService.reloadServiceRequests();
        if (globalThis.window !== undefined && globalThis.window.innerWidth < 768) {
            this.filtersExpanded.set(false);
        }
    }

    ngAfterViewInit(): void {
        this.hasInitializedFinancialChart = true;
        this.hasInitializedServiceStatusChart = true;
        this.scheduleFinancialTotalsRender();
        this.scheduleServiceStatusRender();
        globalThis.window.addEventListener("resize", this.handleResize);
    }


    ngOnDestroy(): void {
        globalThis.window.removeEventListener("resize", this.handleResize);
    }

    activeRequests = computed(() =>
        this.dataService.serviceRequests().filter(
            (r) =>
                r.valor &&
                r.status !== "Cancelado" &&
                r.status !== ("Cancelled" as any) &&
                r.status !== ("Canceled" as any)
        )
    );

    completedRequests = computed(() =>
        this.dataService.serviceRequests().filter(
            (r) =>
                (r.status === "Concluído" || r.status === ("Completed" as any)) &&
                r.valor
        )
    );

    filteredRequests = computed(() => {
        const categoryId = this.categoryFilter();
        const professionalFilterValue = this.professionalFilter();
        const employmentFilter = this.employmentFilter();
        const startDate = this.startDateFilter();
        const endDate = this.endDateFilter();

        return this.activeRequests().filter((request) =>
            this.matchesCategoryFilter(request, categoryId) &&
            this.matchesProfessionalFilter(request, professionalFilterValue) &&
            this.matchesEmploymentFilter(request, employmentFilter) &&
            this.matchesDateFilter(request, startDate, endDate)
        );
    });

    filteredCompletedRequests = computed(() => {
        const categoryId = this.categoryFilter();
        const professionalFilterValue = this.professionalFilter();
        const employmentFilter = this.employmentFilter();
        const startDate = this.startDateFilter();
        const endDate = this.endDateFilter();

        return this.completedRequests().filter((request) =>
            this.matchesCategoryFilter(request, categoryId) &&
            this.matchesProfessionalFilter(request, professionalFilterValue) &&
            this.matchesEmploymentFilter(request, employmentFilter) &&
            this.matchesDateFilter(request, startDate, endDate)
        );
    });

    financialStats = computed(() => {
        const completed = this.filteredCompletedRequests();
        const totalRevenue = completed
            .filter((r) => r.payment_status === "Paid")
            .reduce((sum, r) => sum + (r.valor || 0), 0);

        const outstandingAmount = completed
            .filter((r) => r.payment_status === "Unpaid")
            .reduce((sum, r) => sum + (r.valor || 0), 0);

        return {
            completedServices: completed.length,
            totalRevenue,
            outstandingAmount,
        };
    });

    serviceStatusSummary = computed(() => {
        const fallbackLabel = this.i18n.translate("unknownStatus") || "Unknown";
        const summary = new Map<string, number>();
        const filtered = this.filteredRequests();

        filtered.forEach((request) => {
            const label = (request.status && String(request.status).trim()) || fallbackLabel;
            summary.set(label, (summary.get(label) ?? 0) + 1);
        });

        const total = filtered.length || 0;
        const collator = new Intl.Collator("pt", { sensitivity: "base" });

        return Array.from(summary.entries())
            .map(([status, count]) => ({
                status,
                count,
                percentage: total > 0 ? (count / total) * 100 : 0,
            }))
            .sort((a, b) => {
                if (b.count !== a.count) {
                    return b.count - a.count;
                }
                return collator.compare(a.status, b.status);
            });
    });

    financialBreakdown = computed<FinancialBreakdownItem[]>(() => {
        const totals = {
            serviceValue: 0,
            paidProviders: 0,
            unpaidProviders: 0,
        };

        this.filteredRequests().forEach((request) => {
            totals.serviceValue += this.getServiceValue(request);
            totals.paidProviders += this.getPaidAmount(request);
            totals.unpaidProviders += this.getPendingAmount(request);
        });

        const maxValue = Math.max(totals.serviceValue, totals.paidProviders, totals.unpaidProviders, 1);

        const labels = {
            serviceValue: this.i18n.translate("totalServiceValue") || "Total service value",
            paidProviders: this.i18n.translate("totalPaidToProviders") || "Total paid to providers",
            unpaidProviders: this.i18n.translate("totalUnpaidToProviders") || "Total unpaid to providers",
        } as Record<FinancialBreakdownKey, string>;

        return (Object.keys(totals) as FinancialBreakdownKey[]).map((key) => {
            const value = totals[key];
            const colorStyle = this.financialColorStyles[key];
            return {
                key,
                label: labels[key],
                value,
                percentage: (value / maxValue) * 100,
                colorClass: colorStyle.className,
                color: colorStyle.color,
            };
        });
    });

    private scheduleFinancialTotalsRender(): void {
        if (!this.hasInitializedFinancialChart) {
            return;
        }
        requestAnimationFrame(() => this.renderFinancialTotalsChart());
    }

    private renderFinancialTotalsChart(): void {
        const canvas = this.financialTotalsCanvas?.nativeElement;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        const cssWidth = canvas.clientWidth || 640;
        const cssHeight = canvas.clientHeight || 280;
        const dpr = globalThis.window.devicePixelRatio || 1;

        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);

        const data = this.financialBreakdown();
        const hasPositiveValues = data.some((item) => item.value > 0);
        const count = data.length;
        if (count === 0) {
            return;
        }

        const topPadding = 24;
        const bottomPadding = 48;
        const leftPadding = 48;
        const rightPadding = 48;
        const chartHeight = Math.max(0, cssHeight - topPadding - bottomPadding);
        const maxValue = Math.max(...data.map((item) => item.value), 1);
        const baselineY = cssHeight - bottomPadding;
        const maxAvailableWidth = cssWidth - leftPadding - rightPadding;
        const gap = Math.max(28, Math.min(48, maxAvailableWidth * 0.08));
        const computedBarWidth = (maxAvailableWidth - gap * (count - 1)) / count;
        const barWidth = Math.max(36, Math.min(96, computedBarWidth));
        const totalBarSpan = barWidth * count + gap * (count - 1);
        const startX = leftPadding + Math.max(0, (maxAvailableWidth - totalBarSpan) / 2);

        const isDarkMode = document.documentElement.classList.contains("dark");
        const axisColor = isDarkMode ? "#6B7280" : "#9CA3AF";
        const valueColor = isDarkMode ? "#F3F4F6" : "#111827";

        ctx.strokeStyle = axisColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftPadding - 8, baselineY + 0.5);
        ctx.lineTo(cssWidth - rightPadding + 8, baselineY + 0.5);
        ctx.stroke();

        if (!hasPositiveValues) {
            ctx.fillStyle = axisColor;
            ctx.font = "600 16px 'Inter','Segoe UI',sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(this.i18n.translate("noDataAvailable") || "No data", cssWidth / 2, cssHeight / 2);
            return;
        }

        data.forEach((item, index) => {
            const normalizedHeight = maxValue === 0 ? 0 : (item.value / maxValue) * chartHeight;
            const renderedHeight = Math.max(normalizedHeight, item.value > 0 ? 6 : 0);
            const x = startX + index * (barWidth + gap);
            const y = baselineY - renderedHeight;

            ctx.fillStyle = item.color;
            ctx.fillRect(x, y, barWidth, renderedHeight);

            if (item.value > 0) {
                ctx.fillStyle = valueColor;
                ctx.font = "600 12px 'Inter','Segoe UI',sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(this.formatCost(item.value), x + barWidth / 2, Math.max(topPadding + 12, y - 8));
            }
        });
    }

    private scheduleServiceStatusRender(): void {
        if (!this.hasInitializedServiceStatusChart) {
            return;
        }
        requestAnimationFrame(() => this.renderServiceStatusChart());
    }

    private renderServiceStatusChart(): void {
        const canvas = this.serviceStatusCanvas?.nativeElement;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        const cssWidth = canvas.clientWidth || 640;
        const cssHeight = canvas.clientHeight || 280;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);

        const data = this.serviceStatusSummary();
        const hasValues = data.some((item) => item.count > 0);
        if (!data.length) {
            return;
        }

        const topPadding = 24;
        const bottomPadding = 48;
        const leftPadding = 48;
        const rightPadding = 48;
        const chartHeight = Math.max(0, cssHeight - topPadding - bottomPadding);
        const maxValue = Math.max(...data.map((item) => item.count), 1);
        const baselineY = cssHeight - bottomPadding;
        const maxAvailableWidth = cssWidth - leftPadding - rightPadding;
        const count = data.length;
        const gap = Math.max(20, Math.min(36, maxAvailableWidth * 0.06));
        const computedBarWidth = (maxAvailableWidth - gap * (count - 1)) / count;
        const barWidth = Math.max(26, Math.min(64, computedBarWidth));
        const totalBarSpan = barWidth * count + gap * (count - 1);
        const startX = leftPadding + Math.max(0, (maxAvailableWidth - totalBarSpan) / 2);

        const isDarkMode = document.documentElement.classList.contains("dark");
        const axisColor = isDarkMode ? "#6B7280" : "#9CA3AF";
        const valueColor = isDarkMode ? "#F3F4F6" : "#111827";

        ctx.strokeStyle = axisColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftPadding - 8, baselineY + 0.5);
        ctx.lineTo(cssWidth - rightPadding + 8, baselineY + 0.5);
        ctx.stroke();

        if (!hasValues) {
            ctx.fillStyle = axisColor;
            ctx.font = "600 16px 'Inter','Segoe UI',sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(this.i18n.translate("noDataAvailable") || "No data", cssWidth / 2, cssHeight / 2);
            return;
        }

        data.forEach((item, index) => {
            const normalizedHeight = maxValue === 0 ? 0 : (item.count / maxValue) * chartHeight;
            const renderedHeight = Math.max(normalizedHeight, item.count > 0 ? 6 : 0);
            const x = startX + index * (barWidth + gap);
            const y = baselineY - renderedHeight;

            ctx.fillStyle = this.getStatusColor(item.status);
            ctx.fillRect(x, y, barWidth, renderedHeight);

            if (item.count > 0) {
                ctx.fillStyle = valueColor;
                ctx.font = "600 12px 'Inter','Segoe UI',sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(String(item.count), x + barWidth / 2, Math.max(topPadding + 12, y - 8));
            }
        });
    }

    formatCost(cost: number | undefined): string {
        if (cost === undefined || cost === null) return "€0.00";
        return new Intl.NumberFormat("pt-PT", {
            style: "currency",
            currency: "EUR",
        }).format(cost);
    }

    formatAmountValue(amount: number | undefined): string {
        if (amount === undefined || amount === null) return "0,00";
        return new Intl.NumberFormat("pt-PT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    }

    exportToCSV() {
        console.log("Export to CSV");
        // Implement CSV export logic
    }

    getClientName(clientId: number | null | undefined): string {
        const fallback = this.i18n.translate("unassigned") || "Not assigned";
        if (!clientId) {
            return fallback;
        }
        return this.usersById().get(clientId)?.name || fallback;
    }

    getProfessionalName(profId: number | null | undefined): string {
        const fallback = this.i18n.translate("unassigned") || "Not assigned";
        if (!profId) {
            return fallback;
        }
        return this.usersById().get(profId)?.name || fallback;
    }

    getCategoryName(categoryId: number | null | undefined): string {
        const fallback = this.i18n.translate("unassigned") || "Not assigned";
        if (!categoryId) {
            return fallback;
        }
        return this.categoriesById().get(categoryId)?.name || fallback;
    }

    summarizedRows = computed(() => {
        const rows = new Map<string, {
            categoryId: number | null | undefined;
            professionalId: number | null | undefined;
            categoryName: string;
            professionalName: string;
            hasEmploymentBond: boolean;
            employmentLabel: string;
            serviceValue: number;
            paidAmount: number;
            pendingAmount: number;
            finalAmount: number;
        }>();

        this.filteredRequests().forEach((request) => {
            const key = `${request.category_id ?? "none"}-${request.professional_id ?? "none"}`;
            const serviceValue = this.getServiceValue(request);
            const paidAmount = this.getPaidAmount(request);
            const pendingAmount = this.getPendingAmount(request);
            const finalAmount = this.getFinalAmount(request);
            const hasBond = this.hasEmploymentBond(request);
            const employmentLabel = this.getEmploymentLabel(request);

            if (!rows.has(key)) {
                rows.set(key, {
                    categoryId: request.category_id,
                    professionalId: request.professional_id,
                    categoryName: this.getCategoryName(request.category_id),
                    professionalName: this.getProfessionalName(request.professional_id ?? undefined),
                    hasEmploymentBond: hasBond,
                    employmentLabel,
                    serviceValue: 0,
                    paidAmount: 0,
                    pendingAmount: 0,
                    finalAmount: 0,
                });
            }

            const summary = rows.get(key);
            if (summary) {
                summary.serviceValue += serviceValue;
                summary.paidAmount += paidAmount;
                summary.pendingAmount += pendingAmount;
                summary.finalAmount += finalAmount;
                // employment bond label stays consistent per professional, so no reassignment needed
            }
        });

        return Array.from(rows.values());
    });

    sortedSummaries = computed(() => {
        const column = this.sortBy();
        const direction = this.sortOrder() === "asc" ? 1 : -1;
        const collator = new Intl.Collator("pt", { sensitivity: "base" });

        return [...this.summarizedRows()].sort((a, b) => {
            let comparison = 0;

            switch (column) {
                case "professional":
                    comparison = collator.compare(a.professionalName || "", b.professionalName || "");
                    break;
                case "category":
                    comparison = collator.compare(a.categoryName || "", b.categoryName || "");
                    break;
                case "serviceValue":
                    comparison = a.serviceValue - b.serviceValue;
                    break;
                case "paidAmount":
                    comparison = a.paidAmount - b.paidAmount;
                    break;
                case "pendingAmount":
                    comparison = a.pendingAmount - b.pendingAmount;
                    break;
                case "finalAmount":
                    comparison = a.finalAmount - b.finalAmount;
                    break;
            }

            return comparison * direction;
        });
    });

    paginatedSummaries = computed(() => {
        const start = (this.currentPage() - 1) * this.itemsPerPage();
        const end = start + this.itemsPerPage();
        return this.sortedSummaries().slice(start, end);
    });

    totalPages = computed(() => {
        const total = this.sortedSummaries().length;
        return Math.max(1, Math.ceil(total / this.itemsPerPage()));
    });

    constructor() {
        effect(() => {
            const totalRows = this.sortedSummaries().length;
            const totalPages = this.totalPages();
            const current = this.currentPage();

            if (totalRows === 0) {
                if (current !== 1) {
                    this.currentPage.set(1);
                }
                return;
            }

            if (current > totalPages) {
                this.currentPage.set(totalPages);
            }
        });

        effect(() => {
            this.financialBreakdown();
            this.scheduleFinancialTotalsRender();
        });

        effect(() => {
            this.serviceStatusSummary();
            this.scheduleServiceStatusRender();
        });
    }

    private getProfessional(professionalId: number | null | undefined): User | null {
        if (!professionalId) {
            return null;
        }
        return this.usersById().get(professionalId) ?? null;
    }

    hasEmploymentBond(request: ServiceRequest): boolean {
        return this.getProfessional(request.professional_id)?.is_natan_employee === true;
    }

    getEmploymentLabel(request: ServiceRequest): string {
        return this.hasEmploymentBond(request) ? "Sim" : "Não";
    }

    getServiceValue(request: ServiceRequest): number {
        return request.valor ?? request.service_value ?? 0;
    }

    getPaidAmount(request: ServiceRequest): number {
        if (this.hasEmploymentBond(request)) {
            return 0;
        }
        const providerValue = request.valor_prestador ?? 0;
        return request.payment_status === "Paid" ? providerValue : 0;
    }

    getStatusColor(status: string): string {
        return this.statusColorStyles[status] ?? "#3b82f6";
    }

    toggleChartsPanel(): void {
        const next = !this.chartsExpanded();
        this.chartsExpanded.set(next);
        if (next) {
            setTimeout(() => {
                this.scheduleFinancialTotalsRender();
                this.scheduleServiceStatusRender();
            }, 0);
        }
    }

    async exportReportsToPDF(): Promise<void> {
        const wasCollapsed = !this.chartsExpanded();
        try {
            if (wasCollapsed) {
                this.chartsExpanded.set(true);
                await new Promise((resolve) => setTimeout(resolve, 200));
                this.scheduleFinancialTotalsRender();
                this.scheduleServiceStatusRender();
                await new Promise((resolve) => setTimeout(resolve, 200));
            }

            this.scheduleFinancialTotalsRender();
            this.scheduleServiceStatusRender();
            await new Promise((resolve) => setTimeout(resolve, 150));

            const financialCanvas = this.financialTotalsCanvas?.nativeElement;
            const statusCanvas = this.serviceStatusCanvas?.nativeElement;
            const financialChartImage = financialCanvas?.toDataURL("image/png", 1) ?? null;
            const statusChartImage = statusCanvas?.toDataURL("image/png", 1) ?? null;

            const summaries = this.sortedSummaries();
            const financialLegendItems = this.financialBreakdown();
            const serviceLegendItems = this.serviceStatusSummary();
            const formatCurrency = (value: number) =>
                new Intl.NumberFormat("pt-PT", {
                    style: "currency",
                    currency: "EUR",
                }).format(value || 0);
            const formatPercentage = (value: number) =>
                new Intl.NumberFormat("pt-PT", {
                    style: "percent",
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                }).format(value / 100);
            const encodeHtml = (value: string | number | null | undefined) =>
                String(value ?? "")
                    .replaceAll("&", "&amp;")
                    .replaceAll("<", "&lt;")
                    .replaceAll(">", "&gt;")
                    .replaceAll('"', "&quot;")
                    .replaceAll("'", "&#39;");

            const financialTitle = this.i18n.translate("financialTotalsChartTitle") ?? "Valores dos Serviços";
            const statusTitle = this.i18n.translate("servicesByStatus") ?? "Serviços por status";
            const professionalLabel = this.i18n.translate("professional") ?? "Profissional";
            const categoryLabel = this.i18n.translate("category") ?? "Categoria";
            const paymentLabel = this.i18n.translate("payment") ?? "Pagamento";
            const unassignedLabel = this.i18n.translate("unassigned") ?? "N/A";
            const noDataLabel = this.i18n.translate("noDataAvailable") ?? "Sem dados";
            const appName = this.i18n.translate("appNameFull") ?? this.i18n.translate("appName") ?? "HomeService";
            const financialReportsLabel = this.i18n.translate("financialReports") ?? "Relatórios Financeiros";
            const legendLabel = this.i18n.translate("legend") ?? "Legenda";
            const quantityLabel = this.i18n.translate("quantity") ?? "Qtde";
            const baseHref = (document.querySelector("base")?.href ?? globalThis.window.location.origin).replace(/\/$/, "");
            const logoUrl = `${baseHref}/assets/logo-new.png`;
            const logoDataUrl = await this.tryLoadImageAsDataUrl(logoUrl);
            const encodedAppName = encodeHtml(appName);
            const encodedFinancialReportsLabel = encodeHtml(financialReportsLabel);
            const encodedLogoSrc = encodeHtml(logoDataUrl ?? logoUrl);
            const encodedLegendLabel = encodeHtml(legendLabel);
            const encodedQuantityLabel = encodeHtml(quantityLabel);

            let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Relatório Financeiro - ${new Date().toLocaleDateString("pt-PT")}</title>
    <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 24px; background: #f7f7fb; }
    h1 { color: #ec4899; margin-bottom: 8px; }
    h2 { color: #2563eb; margin-top: 32px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .brand-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .brand-logo { width: 64px; height: 64px; object-fit: contain; border-radius: 12px; border: 1px solid #e5e7eb; background: #fff; padding: 10px; }
    .brand-name { margin: 0; font-size: 1.35rem; font-weight: 700; color: #111827; }
    .brand-tagline { margin: 4px 0 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
    .charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 20px; }
    .chart-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
    .chart-card img { width: 100%; height: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
    .chart-legend-wrapper { margin-top: 12px; }
    .legend-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #6b7280; letter-spacing: 0.06em; margin: 0 0 6px; }
    .chart-legend { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
    .chart-legend-item { display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; color: #374151; }
    .chart-legend-info { display: flex; align-items: center; gap: 8px; }
    .legend-dot { width: 12px; height: 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.8); box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05); }
    .chart-legend-meta { font-weight: 600; color: #111827; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #e5e7eb; padding: 10px; font-size: 12px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    .footer { margin-top: 24px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
    <div class="brand-header">
        <img class="brand-logo" src="${encodedLogoSrc}" alt="${encodedAppName}" />
        <div>
            <p class="brand-name">${encodedAppName}</p>
            <p class="brand-tagline">${encodedFinancialReportsLabel}</p>
        </div>
    </div>
  <h1>📊 Relatório Financeiro</h1>
  <p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
  <h2>Gráficos</h2>
  <div class="charts">`;

            if (financialChartImage) {
                html += `
    <div class="chart-card">
      <h3>${encodeHtml(financialTitle)}</h3>
      <img src="${financialChartImage}" alt="${encodeHtml(financialTitle)}" />
            ${
                    financialLegendItems.length
                            ? `<div class="chart-legend-wrapper">
                <p class="legend-title">${encodedLegendLabel}</p>
                <ul class="chart-legend">
                        ${financialLegendItems
                            .map(
                                (item) => `
                    <li class="chart-legend-item">
                        <div class="chart-legend-info">
                            <span class="legend-dot" style="background-color:${encodeHtml(item.color)};"></span>
                            <span>${encodeHtml(item.label)}</span>
                        </div>
                        <span class="chart-legend-meta">${encodeHtml(formatCurrency(item.value))}</span>
                    </li>`
                            )
                            .join("")}
                </ul>
            </div>`
                            : ""
            }
        </div>`;
            }

            if (statusChartImage) {
                html += `
    <div class="chart-card">
      <h3>${encodeHtml(statusTitle)}</h3>
      <img src="${statusChartImage}" alt="${encodeHtml(statusTitle)}" />
            ${
                    serviceLegendItems.length
                            ? `<div class="chart-legend-wrapper">
                <p class="legend-title">${encodedLegendLabel}</p>
                <ul class="chart-legend">
                        ${serviceLegendItems
                            .map(
                                (item) => `
                    <li class="chart-legend-item">
                        <div class="chart-legend-info">
                            <span class="legend-dot" style="background-color:${encodeHtml(this.getStatusColor(item.status))};"></span>
                            <span>${encodeHtml(item.status)}</span>
                        </div>
                        <span class="chart-legend-meta">${encodedQuantityLabel}: ${encodeHtml(String(item.count))} • ${encodeHtml(
                                            formatPercentage(item.percentage)
                                    )}</span>
                    </li>`
                            )
                            .join("")}
                </ul>
            </div>`
                            : ""
            }
        </div>`;
            }

            html += `
  </div>
  <h2>Detalhes dos Serviços</h2>
  <table>
    <thead>
      <tr>
        <th>${encodeHtml(professionalLabel)}</th>
        <th>${encodeHtml(categoryLabel)}</th>
        <th>Valor Serviço (€)</th>
        <th>${encodeHtml(paymentLabel)}</th>
        <th>Valor Pago (€)</th>
        <th>Valor a pagar (€)</th>
        <th>Valor final (€)</th>
      </tr>
    </thead>
    <tbody>`;

            summaries.forEach((summary) => {
                const professionalName = encodeHtml(summary.professionalName || unassignedLabel);
                const categoryName = encodeHtml(summary.categoryName || "-");
                const employmentLabel = encodeHtml(summary.employmentLabel ?? "-");
                const serviceValue = encodeHtml(formatCurrency(summary.serviceValue));
                const paidAmount = encodeHtml(formatCurrency(summary.paidAmount));
                const pendingAmount = encodeHtml(formatCurrency(summary.pendingAmount));
                const finalAmount = encodeHtml(formatCurrency(summary.finalAmount));
                html += `
      <tr>
        <td>${professionalName}</td>
        <td>${categoryName}</td>
        <td>${serviceValue}</td>
        <td>${employmentLabel}</td>
        <td>${paidAmount}</td>
        <td>${pendingAmount}</td>
        <td><strong>${finalAmount}</strong></td>
      </tr>`;
            });

            if (!summaries.length) {
                html += `
      <tr><td colspan="7" style="text-align:center; padding:16px;">${encodeHtml(noDataLabel)}</td></tr>`;
            }

            html += `
    </tbody>
  </table>
  <div class="footer">
    <p>Relatório gerado automaticamente pelo HomeService</p>
    <p>© ${new Date().getFullYear()} HomeService</p>
  </div>
</body>
</html>`;

            const printWindow = globalThis.window.open("", "_blank");
            if (!printWindow) {
                this.notificationService.addNotification(
                    this.i18n.translate("popupBlocked") ||
                        "Não foi possível abrir a janela do relatório. Verifique o bloqueador de pop-ups."
                );
                return;
            }

            printWindow.document.documentElement.innerHTML = html;
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 250);
            this.notificationService.addNotification(
                this.i18n.translate("exportSuccessPDF") || "Relatório PDF aberto para impressão!"
            );
        } catch (error) {
            console.error("Erro ao exportar PDF:", error);
            this.notificationService.addNotification(
                this.i18n.translate("exportError") || "Erro ao exportar relatório"
            );
        } finally {
            if (wasCollapsed) {
                this.chartsExpanded.set(false);
            }
        }
    }

    private async tryLoadImageAsDataUrl(url: string): Promise<string | null> {
        try {
            const response = await fetch(url, { cache: "no-store" });
            if (!response.ok) {
                console.warn("[FinancialReportsComponent] Logo fetch failed", response.status, response.statusText);
                return null;
            }
            const blob = await response.blob();
            return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn("[FinancialReportsComponent] Unable to inline logo image", error);
            return null;
        }
    }

    getPendingAmount(request: ServiceRequest): number {
        if (this.hasEmploymentBond(request)) {
            return 0;
        }
        const providerValue = request.valor_prestador ?? 0;
        return request.payment_status === "Paid" ? 0 : providerValue;
    }

    getFinalAmount(request: ServiceRequest): number {
        return this.getServiceValue(request) - this.getPaidAmount(request) - this.getPendingAmount(request);
    }

    getCompletionDate(request: ServiceRequest): string | null {
        return (
            request.work_completed_at ||
            request.actual_end_datetime ||
            request.completed_at ||
            request.scheduled_date ||
            null
        );
    }

    onCategoryFilterChange(value: string): void {
        this.categoryFilter.set(value === "all" || value === "" ? null : Number(value));
        this.resetPagination();
    }

    onProfessionalFilterChange(value: string): void {
        if (value === "all" || value === "") {
            this.professionalFilter.set(null);
            this.resetPagination();
            return;
        }
        if (value === "unassigned") {
            this.professionalFilter.set("unassigned");
            this.resetPagination();
            return;
        }
        this.professionalFilter.set(Number(value));
        this.resetPagination();
    }

    onEmploymentFilterChange(value: string): void {
        const normalized = value as "all" | "employee" | "independent";
        this.employmentFilter.set(normalized);
        this.resetPagination();
    }

    onStartDateChange(value: string): void {
        this.startDateFilter.set(value || null);
        if (this.endDateFilter() && value && new Date(this.endDateFilter()) < new Date(value)) {
            this.endDateFilter.set(null);
        }
        this.resetPagination();
    }

    onEndDateChange(value: string): void {
        this.endDateFilter.set(value || null);
        this.resetPagination();
    }

    clearFilters(): void {
        this.categoryFilter.set(null);
        this.professionalFilter.set(null);
        this.employmentFilter.set("all");
        this.startDateFilter.set(null);
        this.endDateFilter.set(null);
        this.resetPagination();
    }

    toggleFiltersPanel(): void {
        this.filtersExpanded.update((expanded) => !expanded);
    }

    sortByColumn(column: SortColumn): void {
        if (this.sortBy() === column) {
            this.sortOrder.set(this.sortOrder() === "asc" ? "desc" : "asc");
        } else {
            this.sortBy.set(column);
            const defaultOrder: Record<SortColumn, "asc" | "desc"> = {
                professional: "asc",
                category: "asc",
                serviceValue: "desc",
                paidAmount: "desc",
                pendingAmount: "desc",
                finalAmount: "desc",
            };
            this.sortOrder.set(defaultOrder[column]);
        }
        this.resetPagination();
    }

    get pageNumbers(): number[] {
        const total = this.totalPages();
        const current = this.currentPage();
        const pages: number[] = [];

        if (total <= 7) {
            for (let i = 1; i <= total; i++) {
                pages.push(i);
            }
            return pages;
        }

        pages.push(1);
        let start = Math.max(2, current - 1);
        let end = Math.min(total - 1, current + 1);

        if (start > 2) {
            pages.push(-1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (end < total - 1) {
            pages.push(-1);
        }

        pages.push(total);
        return pages;
    }

    previousPage(): void {
        if (this.currentPage() > 1) {
            this.currentPage.update((page) => page - 1);
        }
    }

    nextPage(): void {
        if (this.currentPage() < this.totalPages()) {
            this.currentPage.update((page) => page + 1);
        }
    }

    goToPage(page: number): void {
        if (page !== -1) {
            this.currentPage.set(page);
        }
    }

    setItemsPerPage(items: number): void {
        const value = Math.max(1, items);
        this.itemsPerPage.set(value);
        this.resetPagination();
    }

    private resetPagination(): void {
        this.currentPage.set(1);
    }

    private matchesCategoryFilter(request: ServiceRequest, categoryId: number | null): boolean {
        return categoryId === null || request.category_id === categoryId;
    }

    private matchesProfessionalFilter(request: ServiceRequest, professionalFilterValue: ProfessionalFilterValue): boolean {
        if (professionalFilterValue === "unassigned") {
            return request.professional_id === null || request.professional_id === undefined;
        }
        if (professionalFilterValue === null || professionalFilterValue === undefined) {
            return true;
        }
        return request.professional_id === professionalFilterValue;
    }

    private matchesEmploymentFilter(request: ServiceRequest, employmentFilter: EmploymentFilterValue): boolean {
        if (employmentFilter === "all") {
            return true;
        }
        const hasBond = this.hasEmploymentBond(request);
        return employmentFilter === "employee" ? hasBond : !hasBond;
    }

    private matchesDateFilter(request: ServiceRequest, startDate: string | null, endDate: string | null): boolean {
        const completionDate = this.getCompletionDate(request);
        if (!completionDate) {
            return !startDate && !endDate;
        }
        const date = new Date(completionDate);
        if (startDate && date < new Date(startDate)) {
            return false;
        }
        if (endDate && date > new Date(endDate)) {
            return false;
        }
        return true;
    }
}

