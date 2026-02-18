
import { CommonModule } from "@angular/common";
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from "@angular/core";
import { NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexPlotOptions, ApexXAxis, ApexYAxis, ApexFill, ApexTooltip } from "ng-apexcharts";
import { I18nService } from "../../../i18n.service";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { DataService } from "../../../services/data.service";
import { DailyMileageService } from "../../../services/daily-mileage.service";
import { ExtraServicesService } from "../../../app/services/extra-services.service";
import { DailyMileage, ExtraService, Fueling, ServiceRequest, User, ServiceCategory, ServiceSubcategory } from "../../../models/maintenance.models";
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

type SubcategoryBreakdownId = number | "uncategorized";

type CsvValue = string | number | null | undefined;

type SubcategoryServiceRow = {
    id: number | string;
    title: string;
    originName?: string;
    os?: string | null;
    serviceStartAt?: string | null;
    serviceEndAt?: string | null;
    status?: string;
    serviceValue: number;
    paidAmount: number;
    pendingAmount: number;
    finalAmount: number;
};

type SubcategoryBreakdownItem = {
    id: SubcategoryBreakdownId;
    name: string;
    serviceValue: number;
    paidAmount: number;
    pendingAmount: number;
    finalAmount: number;
    services: SubcategoryServiceRow[];
};

type SummarizedFinancialRow = {
    rowKey: string;
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
    subcategoryBreakdown: SubcategoryBreakdownItem[];
};

type SummarizedRowAccumulator = SummarizedFinancialRow & {
    subcategoryAccumulator: Map<string, SubcategoryBreakdownItem>;
};

type FinancialSummary = {
    totalServiceValue: number;
    extraReimbursements: number;
    fuelingsTotal: number;
    netValue: number;
    totalServices: number;
};

@Component({
    selector: "app-financial-reports",
    standalone: true,
    imports: [CommonModule, I18nPipe, NgApexchartsModule],
    templateUrl: "./financial-reports.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialReportsComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly dataService = inject(DataService);
    private readonly dailyMileageService = inject(DailyMileageService);
    private readonly i18n = inject(I18nService);
    private readonly notificationService = inject(NotificationService);
    private readonly extraServicesService = inject(ExtraServicesService);

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

    private readonly requestsById = computed(() => {
        const map = new Map<number, ServiceRequest>();
        this.dataService.serviceRequests().forEach((request) => {
            if (request?.id !== undefined && request?.id !== null) {
                map.set(request.id, request);
            }
        });
        return map;
    });

    private readonly dailyMileageById = computed(() => {
        const map = new Map<number, DailyMileage>();
        this.dailyMileageService.dailyMileages().forEach((mileage) => {
            if (mileage?.id !== undefined && mileage?.id !== null) {
                map.set(mileage.id, mileage);
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

    private readonly subcategoriesById = computed(() => {
        const map = new Map<number, ServiceSubcategory>();
        this.dataService
            .categories()
            .forEach((category) => {
                category?.subcategories?.forEach((subcategory) => {
                    if (subcategory?.id !== undefined && subcategory?.id !== null) {
                        map.set(subcategory.id, subcategory);
                    }
                });
            });
        return map;
    });

    readonly availableCategories = computed(() => this.dataService.categories());
    readonly availableProfessionals = computed(() =>
        this.dataService
            .users()
            .filter((user) => user.role === "professional" || user.role === "professional_almoxarife")
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
    readonly expandedCategoryRows = signal<Set<string>>(new Set());
    readonly expandedSubcategoryRows = signal<Set<string>>(new Set());
    private readonly financialColorStyles: Record<FinancialBreakdownKey, { className: string; color: string }> = {
        serviceValue: { className: "bg-brand-primary-500", color: "#2563eb" },
        paidProviders: { className: "bg-emerald-500", color: "#10b981" },
        unpaidProviders: { className: "bg-orange-500", color: "#f97316" },
    };
    private readonly waterfallColors: Record<"total" | "reimbursement" | "fuelings" | "net", string> = {
        total: "#64748b",
        reimbursement: "#16a34a",
        fuelings: "#dc2626",
        net: "#64748b",
    };
    private readonly statusColorStyles: Record<string, string> = {
        Solicitado: "#ef4444",
        Requested: "#ef4444",
        "Atribu+�do": "#f97316",
        Assigned: "#f97316",
        "Aguardando Confirma+�+�o": "#8b5cf6",
        "Waiting Confirmation": "#8b5cf6",
        Aceito: "#0ea5e9",
        Accepted: "#0ea5e9",
        Recusado: "#f87171",
        Refused: "#f87171",
        "Data Definida": "#0ea5e9",
        Scheduled: "#0ea5e9",
        "Em Progresso": "#9333ea",
        "In Progress": "#9333ea",
        "Conclu+�do": "#14b8a6",
        "Finalizado": "#14b8a6",
        "Cancelado": "#dc2626",
        Cancelled: "#dc2626",
        Unknown: "#94a3b8",
    };
    private hasInitializedFinancialChart = false;
    private hasInitializedWaterfallChart = false;
    private hasInitializedServiceStatusChart = false;
    private hasInitializedOriginChart = false;
    private hasInitializedServiceOriginChart = false;

    financialWaterfallChartSeries = signal<ApexAxisChartSeries>([]);
    financialWaterfallChartOptions = signal<{
        chart: ApexChart;
        plotOptions: ApexPlotOptions;
        dataLabels: ApexDataLabels;
        xaxis: ApexXAxis;
        yaxis: ApexYAxis;
        fill: ApexFill;
        tooltip: ApexTooltip;
        colors: string[];
        grid: { borderColor: string };
        responsive?: Array<{ breakpoint: number; options: { chart?: Partial<ApexChart>; dataLabels?: ApexDataLabels; xaxis?: ApexXAxis; plotOptions?: ApexPlotOptions } }>;
    }>({
        chart: { type: "bar", height: 320, toolbar: { show: false } },
        plotOptions: { bar: { horizontal: false, columnWidth: "40%", borderRadius: 6, dataLabels: { position: "top" } } },
        dataLabels: { enabled: false },
        xaxis: { categories: [] },
        yaxis: { labels: { formatter: (value: number) => this.formatCost(value) } },
        fill: { opacity: 1 },
        tooltip: { y: { formatter: (value: number) => this.formatCost(value) } },
        colors: [],
        grid: { borderColor: "#e5e7eb" },
        responsive: [],
    });

    financialTotalsChartSeries = signal<ApexAxisChartSeries>([]);
    financialTotalsChartOptions = signal<{
        chart: ApexChart;
        plotOptions: ApexPlotOptions;
        dataLabels: ApexDataLabels;
        xaxis: ApexXAxis;
        yaxis: ApexYAxis;
        fill: ApexFill;
        tooltip: ApexTooltip;
        colors: string[];
        grid: { borderColor: string };
        responsive?: Array<{ breakpoint: number; options: { chart?: Partial<ApexChart>; dataLabels?: ApexDataLabels; xaxis?: ApexXAxis; plotOptions?: ApexPlotOptions } }>;
    }>({
        chart: { type: "bar", height: 280, toolbar: { show: false } },
        plotOptions: { bar: { horizontal: false, columnWidth: "40%", borderRadius: 6, dataLabels: { position: "top" } } },
        dataLabels: { enabled: false },
        xaxis: { categories: [] },
        yaxis: { labels: { formatter: (value: number) => this.formatCost(value) } },
        fill: { opacity: 1 },
        tooltip: { y: { formatter: (value: number) => this.formatCost(value) } },
        colors: [],
        grid: { borderColor: "#e5e7eb" },
        responsive: [],
    });
    private readonly handleResize = () => {
        this.setupApexCharts();
        this.scheduleServiceStatusRender();
        this.scheduleOriginValuesRender();
        this.scheduleServiceOriginRender();
        if (globalThis.window !== undefined && globalThis.window.innerWidth >= 1024 && !this.filtersExpanded()) {
            this.filtersExpanded.set(true);
        }
    };

    @ViewChild("serviceStatusCanvas") private readonly serviceStatusCanvas?: ElementRef<HTMLCanvasElement>;
    @ViewChild("originValuesCanvas") private readonly originValuesCanvas?: ElementRef<HTMLCanvasElement>;
    @ViewChild("serviceOriginCanvas") private readonly serviceOriginCanvas?: ElementRef<HTMLCanvasElement>;

    ngOnInit() {
        console.log('[FinancialReportsComponent] Inicializando - recarregando dados de solicita+�+�es');
        this.dataService.reloadServiceRequests();
        void this.extraServicesService.loadExtraServices();
        void this.dailyMileageService.loadAllDailyMileages();
        void this.dailyMileageService.loadAllFuelings();
        
        // Inicializa filtros de data: primeiro dia do m+�s corrente at+� dia corrente
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Formato date input: YYYY-MM-DD
        const formatDate = (date: Date): string => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        this.startDateFilter.set(formatDate(firstDayOfMonth));
        this.endDateFilter.set(formatDate(now));
        
        if (globalThis.window !== undefined && globalThis.window.innerWidth < 768) {
            this.filtersExpanded.set(false);
        }
    }

    ngAfterViewInit(): void {
        this.hasInitializedWaterfallChart = true;
        this.hasInitializedServiceStatusChart = true;
        this.hasInitializedOriginChart = true;
        this.hasInitializedServiceOriginChart = true;
        this.setupApexCharts();
        this.scheduleServiceStatusRender();
        this.scheduleOriginValuesRender();
        this.scheduleServiceOriginRender();
        globalThis.window.addEventListener("resize", this.handleResize);
    }


    ngOnDestroy(): void {
        globalThis.window.removeEventListener("resize", this.handleResize);
    }

    private normalizeStatus(status: unknown): string {
        if (status === null || status === undefined) {
            return "";
        }
        if (typeof status === "string") {
            return status.trim().toLowerCase();
        }
        if (typeof status === "number" || typeof status === "boolean" || typeof status === "bigint") {
            return String(status).trim().toLowerCase();
        }
        return "";
    }

    private isCancelledStatus(status: unknown): boolean {
        const normalized = this.normalizeStatus(status);
        return normalized === "cancelado" || normalized === "cancelled" || normalized === "canceled";
    }

    private isNotCancelledStatus(status: unknown): boolean {
        const normalized = this.normalizeStatus(status);
        return normalized !== "cancelado" && normalized !== "cancelled" && normalized !== "canceled";
    }

    private isCompletedStatus(status: unknown): boolean {
        const normalized = this.normalizeStatus(status);
        return (
            normalized === "conclu+�do" ||
            normalized === "concluido" ||
            normalized === "finalizado" ||
            normalized === "completed" ||
            normalized === "finalized"
        );
    }

    private toLocalDateString(value: string): string | null {
        const trimmed = value.trim();

        // Evita o comportamento do JS onde new Date('YYYY-MM-DD') +� interpretado como UTC
        // (o que pode deslocar o dia em timezones negativos).
        const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
        const parsed = ymdMatch
            ? new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]))
            : new Date(trimmed);

        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    activeRequests = computed(() => this.dataService.serviceRequests().filter((r) => this.isNotCancelledStatus(r.status)));

    completedRequests = computed(() => this.dataService.serviceRequests().filter((r) => this.isCompletedStatus(r.status)));

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

    filteredExtraServices = computed(() => {
        const categoryId = this.categoryFilter();
        const professionalFilterValue = this.professionalFilter();
        const employmentFilter = this.employmentFilter();
        const startDate = this.startDateFilter();
        const endDate = this.endDateFilter();

        return this.extraServicesService.extraServices().filter((service: ExtraService) => {
            if (!this.matchesProfessionalIdFilter(service.professional_id, professionalFilterValue)) {
                return false;
            }
            if (!this.matchesEmploymentFilterForProfessionalId(service.professional_id, employmentFilter)) {
                return false;
            }
            if (categoryId !== null && this.requestsById().get(service.service_request_id)?.category_id !== categoryId) {
                return false;
            }
            const referenceDate = service.reimbursement_date || service.created_at;
            return this.matchesDateRange(referenceDate, startDate, endDate);
        });
    });

    filteredFuelings = computed(() => {
        const professionalFilterValue = this.professionalFilter();
        const employmentFilter = this.employmentFilter();
        const startDate = this.startDateFilter();
        const endDate = this.endDateFilter();

        return this.dailyMileageService.fuelings().filter((fueling: Fueling) => {
            const mileage = this.dailyMileageById().get(fueling.daily_mileage_id);
            if (!mileage) {
                return false;
            }
            if (!this.matchesProfessionalIdFilter(mileage.professional_id, professionalFilterValue)) {
                return false;
            }
            if (!this.matchesEmploymentFilterForProfessionalId(mileage.professional_id, employmentFilter)) {
                return false;
            }
            return this.matchesDateRange(mileage.date, startDate, endDate);
        });
    });

    readonly financialWaterfallSummary = computed<FinancialSummary>(() => {
        const requests = this.filteredRequests();
        const totalServiceValue = this.roundCurrency(requests.reduce((sum, request) => sum + this.getServiceValue(request), 0));
        const extraReimbursements = this.roundCurrency(this.filteredExtraServices().reduce((sum, service) => {
            if (typeof service.reimbursement_value !== "number") {
                return sum;
            }
            return sum + service.reimbursement_value;
        }, 0));
        const fuelingsTotal = this.roundCurrency(this.filteredFuelings().reduce((sum, fueling) => sum + (fueling.value || 0), 0));
        const netValue = this.roundCurrency(totalServiceValue + extraReimbursements - fuelingsTotal);

        return {
            totalServiceValue,
            extraReimbursements,
            fuelingsTotal,
            netValue,
            totalServices: requests.length,
        };
    });

    readonly hasFinancialWaterfallData = computed(() => {
        const summary = this.financialWaterfallSummary();
        return (
            summary.totalServices > 0 ||
            summary.totalServiceValue > 0 ||
            summary.extraReimbursements > 0 ||
            summary.fuelingsTotal > 0
        );
    });

    readonly previousPeriodRange = computed(() => {
        const startDate = this.startDateFilter();
        const endDate = this.endDateFilter();
        if (!startDate || !endDate) {
            return null;
        }

        const start = this.parseInputDate(startDate);
        const end = this.parseInputDate(endDate);
        if (!start || !end || end < start) {
            return null;
        }

        const dayMs = 24 * 60 * 60 * 1000;
        const periodDays = Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
        if (periodDays <= 0) {
            return null;
        }

        const previousEnd = new Date(start.getTime() - dayMs);
        const previousStart = new Date(previousEnd.getTime() - (periodDays - 1) * dayMs);

        return {
            startDate: this.toInputDate(previousStart),
            endDate: this.toInputDate(previousEnd),
        };
    });

    readonly financialWaterfallComparison = computed(() => {
        const period = this.previousPeriodRange();
        if (!period) {
            return null;
        }

        const previousSummary = this.calculateFinancialSummaryForRange(period.startDate, period.endDate);
        const currentNet = this.financialWaterfallSummary().netValue;
        const delta = this.roundCurrency(currentNet - previousSummary.netValue);
        const deltaPercentage = previousSummary.netValue === 0
            ? null
            : this.roundCurrency((delta / Math.abs(previousSummary.netValue)) * 100);

        return {
            currentNet,
            previousNet: previousSummary.netValue,
            delta,
            deltaPercentage,
            isPositive: delta >= 0,
            previousStartDate: period.startDate,
            previousEndDate: period.endDate,
        };
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

    originValuesSummary = computed(() => {
        const summary = new Map<string, number>();
        const filtered = this.filteredRequests();
        const fallbackLabel = this.i18n.translate("unknownOrigin") || "Origem Desconhecida";

        filtered.forEach((request) => {
            const originName = request.origin?.name || fallbackLabel;
            const value = this.getServiceValue(request);
            summary.set(originName, (summary.get(originName) ?? 0) + value);
        });

        const total = Array.from(summary.values()).reduce((sum, val) => sum + val, 0);
        const collator = new Intl.Collator("pt", { sensitivity: "base" });

        return Array.from(summary.entries())
            .map(([origin, value]) => ({
                origin,
                value,
                percentage: total > 0 ? (value / total) * 100 : 0,
            }))
            .sort((a, b) => {
                if (b.value !== a.value) {
                    return b.value - a.value;
                }
                return collator.compare(a.origin, b.origin);
            });
    });

    serviceOriginSummary = computed(() => {
        const summary = new Map<string, number>();
        const filtered = this.filteredRequests();
        const fallbackLabel = this.i18n.translate("unknownOrigin") || "Origem Desconhecida";

        filtered.forEach((request) => {
            const originName = request.origin?.name || fallbackLabel;
            summary.set(originName, (summary.get(originName) ?? 0) + 1);
        });

        const total = filtered.length || 0;
        const collator = new Intl.Collator("pt", { sensitivity: "base" });

        return Array.from(summary.entries())
            .map(([origin, count]) => ({
                origin,
                count,
                percentage: total > 0 ? (count / total) * 100 : 0,
            }))
            .sort((a, b) => {
                if (b.count !== a.count) {
                    return b.count - a.count;
                }
                return collator.compare(a.origin, b.origin);
            });
    });

    financialBreakdown = computed<FinancialBreakdownItem[]>(() => {
        const totals = {
            serviceValue: 0,
            paidProviders: 0,
            unpaidProviders: 0,
        };

        this.filteredRequests().forEach((request) => {
            const paidAmount = this.getPaidAmount(request);
            const pendingAmount = this.getPendingAmount(request);
            totals.paidProviders += paidAmount;
            totals.unpaidProviders += pendingAmount;
        });

        totals.paidProviders = this.roundCurrency(totals.paidProviders);
        totals.unpaidProviders = this.roundCurrency(totals.unpaidProviders);

        // Total deve ser igual +� soma de Pago + N+�o pago
        totals.serviceValue = this.roundCurrency(totals.paidProviders + totals.unpaidProviders);

        console.log('��Ʀ [FinancialBreakdown] Pago:', totals.paidProviders, 'N+�o pago:', totals.unpaidProviders, 'Total calculado:', totals.serviceValue);

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

    private scheduleOriginValuesRender(): void {
        if (!this.hasInitializedOriginChart) {
            return;
        }
        requestAnimationFrame(() => this.renderOriginValuesChart());
    }

    private renderOriginValuesChart(): void {
        const canvas = this.originValuesCanvas?.nativeElement;
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

        const data = this.originValuesSummary();
        const hasValues = data.some((item) => item.value > 0);
        if (!data.length) {
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
        const count = data.length;
        const gap = Math.max(20, Math.min(36, maxAvailableWidth * 0.06));
        const computedBarWidth = (maxAvailableWidth - gap * (count - 1)) / count;
        const barWidth = Math.max(26, Math.min(64, computedBarWidth));
        const totalBarSpan = barWidth * count + gap * (count - 1);
        const startX = leftPadding + Math.max(0, (maxAvailableWidth - totalBarSpan) / 2);

        const isDarkMode = document.documentElement.classList.contains("dark");
        const axisColor = isDarkMode ? "#6B7280" : "#9CA3AF";
        const valueColor = isDarkMode ? "#F3F4F6" : "#111827";
        const originColors = ["#2563eb", "#10b981", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

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
            ctx.fillText(this.i18n.translate("noDataAvailable") || "Sem dados", cssWidth / 2, cssHeight / 2);
            return;
        }

        data.forEach((item, index) => {
            const normalizedHeight = maxValue === 0 ? 0 : (item.value / maxValue) * chartHeight;
            const renderedHeight = Math.max(normalizedHeight, item.value > 0 ? 6 : 0);
            const x = startX + index * (barWidth + gap);
            const y = baselineY - renderedHeight;

            ctx.fillStyle = originColors[index % originColors.length];
            ctx.fillRect(x, y, barWidth, renderedHeight);

            if (item.value > 0) {
                ctx.fillStyle = valueColor;
                ctx.font = "600 12px 'Inter','Segoe UI',sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(this.formatCost(item.value), x + barWidth / 2, Math.max(topPadding + 12, y - 8));
            }
        });
    }

    private scheduleServiceOriginRender(): void {
        if (!this.hasInitializedServiceOriginChart) {
            return;
        }
        requestAnimationFrame(() => this.renderServiceOriginChart());
    }

    private renderServiceOriginChart(): void {
        const canvas = this.serviceOriginCanvas?.nativeElement;
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

        const data = this.serviceOriginSummary();
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
        const originColors = ["#2563eb", "#10b981", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

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
            ctx.fillText(this.i18n.translate("noDataAvailable") || "Sem dados", cssWidth / 2, cssHeight / 2);
            return;
        }

        data.forEach((item, index) => {
            const normalizedHeight = maxValue === 0 ? 0 : (item.count / maxValue) * chartHeight;
            const renderedHeight = Math.max(normalizedHeight, item.count > 0 ? 6 : 0);
            const x = startX + index * (barWidth + gap);
            const y = baselineY - renderedHeight;

            ctx.fillStyle = originColors[index % originColors.length];
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
        if (cost === undefined || cost === null) return "0,00 €";

        const roundedValue = this.roundCurrency(cost);
        const absoluteValue = Math.abs(roundedValue);
        const formattedNumber = new Intl.NumberFormat("pt-PT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true,
        }).format(absoluteValue);

        const sign = roundedValue < 0 ? "-" : "";
        return `${sign}${formattedNumber} €`;
    }

    formatAmountValue(amount: number | undefined): string {
        if (amount === undefined || amount === null) return "0,00";
        return new Intl.NumberFormat("pt-PT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    }

    exportToCSV(): void {
        const summaries = this.sortedSummaries();
        if (!summaries.length) {
            this.notificationService.addNotification(
                this.i18n.translate("noDataAvailable") || "Sem dados dispon+�veis para exporta+�+�o"
            );
            return;
        }

        try {
            const csvContent = this.buildCsvContent(summaries);
            this.triggerCsvDownload(csvContent);
            this.notificationService.addNotification(
                this.i18n.translate("exportSuccessCSV") ||
                    this.i18n.translate("exportSuccess") ||
                    "Arquivo CSV gerado com sucesso!"
            );
        } catch (error) {
            console.error("Erro ao exportar CSV:", error);
            this.notificationService.addNotification(
                this.i18n.translate("exportError") || "Erro ao exportar relat+�rio"
            );
        }
    }

    private buildCsvContent(summaries: SummarizedFinancialRow[]): string {
        const categoryHeader = this.translateOrFallback("category", "Categoria");
        const subcategoryHeader = this.translateOrFallback("subcategory", "Subcategoria");
        const serviceHeader = this.translateAnyOrFallback(["serviceRequest", "service"], "Solicita+�+�o");
        const headerLabels = [
            this.translateOrFallback("professional", "Profissional"),
            categoryHeader,
            subcategoryHeader,
            serviceHeader,
            this.translateOrFallback("employmentBond", "V+�nculo"),
            this.translateOrFallback("serviceValueColumn", "Valor Servi+�o (��)"),
            this.translateOrFallback("paidAmount", "Valor Pago (��)"),
            this.translateOrFallback("pendingAmount", "Valor em aberto (��)"),
            this.translateOrFallback("finalAmount", "Valor final (��)"),
        ];
        const rows: string[] = [this.toCsvRow(headerLabels)];
        const unassignedLabel = this.translateOrFallback("unassigned", "N/A");

        summaries.forEach((summary) => {
            summary.subcategoryBreakdown.forEach((subcategory) => {
                subcategory.services.forEach((service) => {
                    rows.push(
                        this.toCsvRow([
                            summary.professionalName || unassignedLabel,
                            summary.categoryName || "-",
                            `${subcategory.name}`,
                            `${service.title}`,
                            summary.employmentLabel ?? "-",
                            this.formatCsvNumber(service.serviceValue),
                            this.formatCsvNumber(service.paidAmount),
                            this.formatCsvNumber(service.pendingAmount),
                            this.formatCsvNumber(service.finalAmount),
                        ])
                    );
                });
            });
        });

        return "\uFEFF" + rows.join("\r\n");
    }

    private translateOrFallback(key: string, fallback: string): string {
        const value = this.i18n.translate(key);
        if (typeof value === "string" && value.trim().length > 0 && value !== key) {
            return value;
        }
        return fallback;
    }

    private translateAnyOrFallback(keys: string[], fallback: string): string {
        for (const key of keys) {
            const value = this.i18n.translate(key);
            if (typeof value === "string" && value.trim().length > 0 && value !== key) {
                return value;
            }
        }
        return fallback;
    }

    private toCsvRow(values: Array<CsvValue>): string {
        return values.map((value) => this.quoteCsvValue(value)).join(";");
    }

    private quoteCsvValue(value: CsvValue): string {
        const stringValue = value === null || value === undefined ? "" : String(value);
        return `"${stringValue.replaceAll("\"", "\"\"")}"`;
    }

    private formatCsvNumber(value: number | null | undefined): string {
        const safeValue = typeof value === "number" && !Number.isNaN(value) ? value : 0;
        return safeValue.toFixed(2).replace(".", ",");
    }

    private triggerCsvDownload(csvContent: string): void {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const fileName = `relatorio-financeiro-${new Date().toISOString().split("T")[0]}.csv`;
        anchor.href = url;
        anchor.setAttribute("download", fileName);
        anchor.style.display = "none";
        document.body?.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
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

    private getSubcategoryName(subcategoryId: number | null | undefined): string {
        if (!subcategoryId) {
            return this.i18n.translate("noSubcategories") || "Sem subcategoria";
        }
        return (
            this.subcategoriesById().get(subcategoryId)?.name ||
            this.i18n.translate("subcategory") ||
            "Subcategoria"
        );
    }

    private addRequestToSubcategoryBreakdown(
        accumulator: Map<string, SubcategoryBreakdownItem>,
        request: ServiceRequest,
        serviceValue: number,
        paidAmount: number,
        pendingAmount: number,
        finalAmount: number
    ): void {
        if (serviceValue <= 0) {
            return;
        }

        const subcategoryId: SubcategoryBreakdownId = request.subcategory_id ?? "uncategorized";
        const key = String(subcategoryId);
        if (!accumulator.has(key)) {
            accumulator.set(key, {
                id: subcategoryId,
                name: this.getSubcategoryName(request.subcategory_id),
                serviceValue: 0,
                paidAmount: 0,
                pendingAmount: 0,
                finalAmount: 0,
                services: [],
            });
        }
        const item = accumulator.get(key);
        if (item) {
            item.serviceValue += serviceValue;
            item.paidAmount += paidAmount;
            item.pendingAmount += pendingAmount;
            item.finalAmount += finalAmount;

            const originFallback = this.i18n.translate("unknownOrigin") || "Origem Desconhecida";
            const originName = request.origin?.name || originFallback;
            const statusFallback = this.i18n.translate("unknownStatus") || "Unknown";
            const status = (request.status && String(request.status).trim()) || statusFallback;
            const serviceStartAt = request.actual_start_datetime ?? request.started_at ?? request.scheduled_start_datetime ?? null;
            const serviceEndAt = request.actual_end_datetime ?? request.completed_at ?? null;

            item.services.push({
                id: request.id ?? `${key}-${item.services.length}`,
                title: request.title || this.i18n.translate("service") || "Servi+�o",
                originName,
                os: request.os ?? null,
                serviceStartAt,
                serviceEndAt,
                status,
                serviceValue,
                paidAmount,
                pendingAmount,
                finalAmount,
            });
        }
    }

    summarizedRows = computed<SummarizedFinancialRow[]>(() => {
        const rows = new Map<string, SummarizedRowAccumulator>();

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
                    rowKey: key,
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
                    subcategoryBreakdown: [],
                    subcategoryAccumulator: new Map<string, SubcategoryBreakdownItem>(),
                });
            }

            const summary = rows.get(key);
            if (summary) {
                summary.serviceValue += serviceValue;
                summary.paidAmount += paidAmount;
                summary.pendingAmount += pendingAmount;
                summary.finalAmount += finalAmount;
                this.addRequestToSubcategoryBreakdown(
                    summary.subcategoryAccumulator,
                    request,
                    serviceValue,
                    paidAmount,
                    pendingAmount,
                    finalAmount
                );
                // employment bond label stays consistent per professional, so no reassignment needed
            }
        });

        return Array.from(rows.values()).map((summary) => {
            const { subcategoryAccumulator, ...rest } = summary;
            return {
                ...rest,
                subcategoryBreakdown: Array.from(subcategoryAccumulator.values())
                    .filter((item) => item.serviceValue > 0)
                    .map((item) => ({
                        ...item,
                        services: [...item.services].sort(
                            (a, b) => b.serviceValue - a.serviceValue
                        ),
                    }))
                    .sort((a, b) => b.serviceValue - a.serviceValue),
            };
        });
    });

    sortedSummaries = computed<SummarizedFinancialRow[]>(() => {
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

    paginatedSummaries = computed<SummarizedFinancialRow[]>(() => {
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
            this.financialWaterfallSummary();
            this.financialBreakdown();
            this.setupApexCharts();
        });

        effect(() => {
            this.serviceStatusSummary();
            this.scheduleServiceStatusRender();
        });

        effect(() => {
            this.originValuesSummary();
            this.scheduleOriginValuesRender();
        });

        effect(() => {
            this.serviceOriginSummary();
            this.scheduleServiceOriginRender();
        });

        effect(() => {
            const validKeys = new Set(this.sortedSummaries().map((row) => row.rowKey));
            this.expandedCategoryRows.update((current) => {
                const next = new Set<string>();
                current.forEach((key) => {
                    if (validKeys.has(key)) {
                        next.add(key);
                    }
                });
                return next;
            });
        });

        effect(() => {
            const validKeys = new Set<string>();
            this.sortedSummaries().forEach((row) => {
                row.subcategoryBreakdown.forEach((subcategory) => {
                    validKeys.add(this.getSubcategoryRowKey(row.rowKey, subcategory.id));
                });
            });
            this.expandedSubcategoryRows.update((current) => {
                const next = new Set<string>();
                current.forEach((key) => {
                    if (validKeys.has(key)) {
                        next.add(key);
                    }
                });
                return next;
            });
        });
    }

    private setupApexCharts(): void {
        const isMobile = globalThis.window !== undefined && globalThis.window.innerWidth < 768;
        const summary = this.financialWaterfallSummary();
        const totalServiceValue = this.roundCurrency(summary.totalServiceValue);
        const extraReimbursements = this.roundCurrency(summary.extraReimbursements);
        const fuelingsImpact = this.roundCurrency(-summary.fuelingsTotal);
        const afterExtras = this.roundCurrency(totalServiceValue + extraReimbursements);
        const netValue = this.roundCurrency(afterExtras + fuelingsImpact);

        const waterfallItems = [
            {
                label: isMobile ? "Total" : "Valor Total",
                start: 0,
                end: totalServiceValue,
                displayValue: totalServiceValue,
                color: this.waterfallColors.total,
            },
            {
                label: isMobile ? "Extras" : "Reembolso Extras",
                start: totalServiceValue,
                end: afterExtras,
                displayValue: extraReimbursements,
                color: this.waterfallColors.reimbursement,
            },
            {
                label: isMobile ? "Abast." : "Abastecimentos",
                start: afterExtras,
                end: netValue,
                displayValue: fuelingsImpact,
                color: this.waterfallColors.fuelings,
            },
            {
                label: isMobile ? "Líquido" : "Valor Líquido",
                start: 0,
                end: netValue,
                displayValue: netValue,
                color: this.waterfallColors.net,
            },
        ];

        this.financialWaterfallChartSeries.set([
            {
                name: "Resumo Financeiro",
                data: waterfallItems.map((item) => ({ x: item.label, y: [item.start, item.end], fillColor: item.color })),
            },
        ]);
        this.financialWaterfallChartOptions.set({
            chart: { type: "rangeBar", height: isMobile ? 260 : 320, toolbar: { show: false } },
            plotOptions: { bar: { horizontal: false, columnWidth: "46%", borderRadius: 6, dataLabels: { position: "top" } } },
            dataLabels: {
                enabled: !isMobile,
                formatter: (_val: number, opt?: { dataPointIndex?: number }) => {
                    const index = opt?.dataPointIndex ?? -1;
                    return this.formatCost(waterfallItems[index]?.displayValue ?? 0);
                },
                offsetY: -16,
                style: { fontSize: "13px", fontWeight: 600 },
            },
            xaxis: { categories: waterfallItems.map((item) => item.label), labels: { style: { fontWeight: 500 } } },
            yaxis: { labels: { formatter: (val: number) => this.formatCost(val) } },
            fill: { opacity: 1 },
            tooltip: {
                y: {
                    formatter: (_val: number, opt?: { dataPointIndex?: number }) => {
                        const index = opt?.dataPointIndex ?? -1;
                        return this.formatCost(waterfallItems[index]?.displayValue ?? 0);
                    },
                },
            },
            colors: waterfallItems.map((item) => item.color),
            grid: { borderColor: "#e5e7eb" },
            responsive: [{
                breakpoint: 768,
                options: {
                    chart: { height: 260 },
                    dataLabels: { enabled: false },
                    plotOptions: { bar: { columnWidth: "58%", borderRadius: 4 } },
                    xaxis: { labels: { rotate: 0, trim: true, style: { fontSize: "10px", fontWeight: 500 } } },
                },
            }],
        });

        const breakdown = this.financialBreakdown();
        this.financialTotalsChartSeries.set([
            {
                name: "Totais",
                data: breakdown.map((item) => ({ x: item.label, y: item.value, fillColor: item.color })),
            },
        ]);
        this.financialTotalsChartOptions.set({
            chart: { type: "bar", height: isMobile ? 250 : 280, toolbar: { show: false } },
            plotOptions: { bar: { horizontal: false, columnWidth: "40%", borderRadius: 6, dataLabels: { position: "top" } } },
            dataLabels: {
                enabled: !isMobile,
                formatter: (val: number) => this.formatCost(val),
                offsetY: -16,
                style: { fontSize: "13px", fontWeight: 600 },
            },
            xaxis: { categories: breakdown.map((item) => item.label), labels: { style: { fontWeight: 500 } } },
            yaxis: { labels: { formatter: (val: number) => this.formatCost(val) } },
            fill: { opacity: 1 },
            tooltip: { y: { formatter: (val: number) => this.formatCost(val) } },
            colors: breakdown.map((item) => item.color),
            grid: { borderColor: "#e5e7eb" },
            responsive: [{
                breakpoint: 768,
                options: {
                    chart: { height: 250 },
                    dataLabels: { enabled: false },
                    plotOptions: { bar: { columnWidth: "52%", borderRadius: 4 } },
                    xaxis: { labels: { rotate: 0, trim: true, style: { fontSize: "10px", fontWeight: 500 } } },
                },
            }],
        });
    }

    private roundCurrency(value: number): number {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    private parseInputDate(value: string): Date | null {
        const [yearStr, monthStr, dayStr] = value.split("-");
        const year = Number(yearStr);
        const month = Number(monthStr);
        const day = Number(dayStr);
        if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
            return null;
        }
        const parsed = new Date(year, month - 1, day);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }
        return parsed;
    }

    private toInputDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    private calculateFinancialSummaryForRange(startDate: string, endDate: string): FinancialSummary {
        const categoryId = this.categoryFilter();
        const professionalFilterValue = this.professionalFilter();
        const employmentFilter = this.employmentFilter();

        const requests = this.activeRequests().filter((request) =>
            this.matchesCategoryFilter(request, categoryId) &&
            this.matchesProfessionalFilter(request, professionalFilterValue) &&
            this.matchesEmploymentFilter(request, employmentFilter) &&
            this.matchesDateFilter(request, startDate, endDate)
        );

        const totalServiceValue = this.roundCurrency(requests.reduce((sum, request) => sum + this.getServiceValue(request), 0));

        const extraReimbursements = this.roundCurrency(this.extraServicesService.extraServices().reduce((sum, service) => {
            if (!this.matchesProfessionalIdFilter(service.professional_id, professionalFilterValue)) {
                return sum;
            }
            if (!this.matchesEmploymentFilterForProfessionalId(service.professional_id, employmentFilter)) {
                return sum;
            }
            if (categoryId !== null && this.requestsById().get(service.service_request_id)?.category_id !== categoryId) {
                return sum;
            }
            const referenceDate = service.reimbursement_date || service.created_at;
            if (!this.matchesDateRange(referenceDate, startDate, endDate)) {
                return sum;
            }
            return sum + (service.reimbursement_value || 0);
        }, 0));

        const fuelingsTotal = this.roundCurrency(this.dailyMileageService.fuelings().reduce((sum, fueling) => {
            const mileage = this.dailyMileageById().get(fueling.daily_mileage_id);
            if (!mileage) {
                return sum;
            }
            if (!this.matchesProfessionalIdFilter(mileage.professional_id, professionalFilterValue)) {
                return sum;
            }
            if (!this.matchesEmploymentFilterForProfessionalId(mileage.professional_id, employmentFilter)) {
                return sum;
            }
            if (!this.matchesDateRange(mileage.date, startDate, endDate)) {
                return sum;
            }
            return sum + (fueling.value || 0);
        }, 0));

        const netValue = this.roundCurrency(totalServiceValue + extraReimbursements - fuelingsTotal);
        return {
            totalServiceValue,
            extraReimbursements,
            fuelingsTotal,
            netValue,
            totalServices: requests.length,
        };
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
        return this.hasEmploymentBond(request) ? "Sim" : "N+�o";
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

    getOriginColor(originName: string): string {
        const originColors = ["#2563eb", "#10b981", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
        const origins = this.originValuesSummary().map(item => item.origin);
        const index = origins.indexOf(originName);
        return originColors[index % originColors.length];
    }

    toggleChartsPanel(): void {
        const next = !this.chartsExpanded();
        this.chartsExpanded.set(next);
        if (next) {
            setTimeout(() => {
                this.setupApexCharts();
                this.scheduleServiceStatusRender();
                this.scheduleOriginValuesRender();
                this.scheduleServiceOriginRender();
            }, 0);
        }
    }

    toggleCategoryRow(rowKey: string): void {
        this.expandedCategoryRows.update((current) => {
            const next = new Set(current);
            if (next.has(rowKey)) {
                next.delete(rowKey);
            } else {
                next.add(rowKey);
            }
            return next;
        });
    }

    isCategoryRowExpanded(rowKey: string): boolean {
        return this.expandedCategoryRows().has(rowKey);
    }

    private getSubcategoryRowKey(rowKey: string, subcategoryId: SubcategoryBreakdownId): string {
        return `${rowKey}::${subcategoryId}`;
    }

    toggleSubcategoryRow(rowKey: string, subcategoryId: SubcategoryBreakdownId): void {
        const key = this.getSubcategoryRowKey(rowKey, subcategoryId);
        this.expandedSubcategoryRows.update((current) => {
            const next = new Set(current);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }

    isSubcategoryRowExpanded(rowKey: string, subcategoryId: SubcategoryBreakdownId): boolean {
        return this.expandedSubcategoryRows().has(this.getSubcategoryRowKey(rowKey, subcategoryId));
    }

    async exportReportsToPDF(): Promise<void> {
        const wasCollapsed = !this.chartsExpanded();
        try {
            if (wasCollapsed) {
                this.chartsExpanded.set(true);
                await new Promise((resolve) => setTimeout(resolve, 200));
                this.setupApexCharts();
                this.scheduleServiceStatusRender();
                this.scheduleOriginValuesRender();
                this.scheduleServiceOriginRender();
                await new Promise((resolve) => setTimeout(resolve, 200));
            }

            this.setupApexCharts();
            this.scheduleServiceStatusRender();
            this.scheduleOriginValuesRender();
            this.scheduleServiceOriginRender();
            await new Promise((resolve) => setTimeout(resolve, 150));

            const getApexChartDataURI = async (chartId: string): Promise<string | null> => {
                const apexCharts = (globalThis as any).ApexCharts;
                const chartObj = apexCharts?.getChartByID?.(chartId);
                const dataUriResult = chartObj ? await chartObj.dataURI() : null;
                return dataUriResult?.imgURI ?? null;
            };

            const financialWaterfallChartImage = await getApexChartDataURI("financialWaterfallApex");
            const financialChartImage = await getApexChartDataURI("financialTotalsApex");
            const statusCanvas = this.serviceStatusCanvas?.nativeElement;
            const originValuesCanvas = this.originValuesCanvas?.nativeElement;
            const serviceOriginCanvas = this.serviceOriginCanvas?.nativeElement;
            const statusChartImage = statusCanvas?.toDataURL("image/png", 1) ?? null;
            const originValuesChartImage = originValuesCanvas?.toDataURL("image/png", 1) ?? null;
            const serviceOriginChartImage = serviceOriginCanvas?.toDataURL("image/png", 1) ?? null;

            const summaries = this.sortedSummaries();
            const financialWaterfallSummary = this.financialWaterfallSummary();
            const financialLegendItems = this.financialBreakdown();
            const serviceLegendItems = this.serviceStatusSummary();
            const originValuesLegendItems = this.originValuesSummary();
            const serviceOriginLegendItems = this.serviceOriginSummary();
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
            const formatDateTime = (iso: string | null | undefined) => {
                if (!iso) return "";
                const date = new Date(iso);
                if (Number.isNaN(date.getTime())) return "";
                return date.toLocaleString("pt-PT", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                });
            };
            const encodeHtml = (value: string | number | null | undefined) =>
                String(value ?? "")
                    .replaceAll("&", "&amp;")
                    .replaceAll("<", "&lt;")
                    .replaceAll(">", "&gt;")
                    .replaceAll('"', "&quot;")
                    .replaceAll("'", "&#39;");

            const financialSummaryTitle = "Resumo Financeiro";
            const financialTitle = this.i18n.translate("financialTotalsChartTitle") ?? "Valores dos Servi+�os";
            const statusTitle = this.i18n.translate("servicesByStatus") ?? "Servi+�os por status";
            const professionalLabel = this.i18n.translate("professional") ?? "Profissional";
            const categoryLabel = this.i18n.translate("category") ?? "Categoria";
            const subcategoryLabel = this.i18n.translate("subcategory") ?? "Subcategoria";
            const serviceLabel = this.i18n.translate("service") ?? "Servi+�o";
            const originLabel = this.i18n.translate("origin") ?? "Origem";
            const osLabel = this.i18n.translate("osOptional") ?? "Ordem de Servi+�o";
            const statusLabel = this.i18n.translate("status") ?? "Status";
            const serviceStartLabel = "In+�cio Atendimento";
            const serviceEndLabel = "Fim Atendimento";
            const notApplicableLabel = this.i18n.translate("notApplicable") ?? "-";
            const unassignedLabel = this.i18n.translate("unassigned") ?? "N/A";
            const noDataLabel = this.i18n.translate("noDataAvailable") ?? "Sem dados";
            const appName = this.i18n.translate("appNameFull") ?? this.i18n.translate("appName") ?? "NatanGeneralService";
            const financialReportsLabel = this.i18n.translate("financialReports") ?? "Relat+�rios Financeiros";
            const legendLabel = this.i18n.translate("legend") ?? "Legenda";
            const quantityLabel = this.i18n.translate("quantity") ?? "Qtde";
            // NOTE: This project publishes assets under `src/assets` (see build output: dist/src/assets).
            // When we open a print window (about:blank) we must ensure URLs resolve from the app origin.
            const originBase = `${globalThis.window.location.origin.replace(/\/$/, "")}/`;
            const encodedBaseHref = encodeHtml(originBase);

            const logoRelativeCandidates = [
                "src/assets/logo-natan.png",
                "src/assets/logo-new.png",
                "src/assets/logo.png",
                // Backward-compatible fallbacks if deployment publishes to `/assets`
                "assets/logo-natan.png",
                "assets/logo-new.png",
                "assets/logo.png",
            ];
            const logoCandidates = logoRelativeCandidates.map((path) => new URL(path, originBase).toString());

            const logoDataUrl = await this.tryLoadFirstAvailableImageAsDataUrl(logoCandidates);
            const logoFallbackSrc = logoRelativeCandidates[0];
            const encodedAppName = encodeHtml(appName);
            const encodedFinancialReportsLabel = encodeHtml(financialReportsLabel);
            const encodedLogoSrc = encodeHtml(logoDataUrl ?? logoFallbackSrc);
            const encodedLegendLabel = encodeHtml(legendLabel);
            const encodedQuantityLabel = encodeHtml(quantityLabel);

            let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
    <base href="${encodedBaseHref}" />
  <title>Relat+�rio Financeiro - ${new Date().toLocaleDateString("pt-PT")}</title>
    <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 24px; background: #f7f7fb; }
    h1 { color: #ec4899; margin-bottom: 8px; }
    h2 { color: #2563eb; margin-top: 32px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .brand-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .brand-logo { width: 64px; height: 64px; object-fit: contain; border-radius: 12px; border: 1px solid #e5e7eb; background: #fff; padding: 10px; }
    .brand-name { margin: 0; font-size: 1.35rem; font-weight: 700; color: #111827; }
    .brand-tagline { margin: 4px 0 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
    .charts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-top: 20px; }
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
    .category-row { background: #f9fafb; font-weight: 600; }
    .subcategory-row { background: #f3f4f6; padding-left: 24px; font-weight: 500; }
    .service-row { background: #ffffff; padding-left: 48px; color: #6b7280; font-size: 11px; }
    .row-label { display: block; font-size: 9px; text-transform: uppercase; color: #9ca3af; font-weight: 500; letter-spacing: 0.05em; margin-bottom: 2px; }
    .filters-section { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .filters-title { font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    .filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .filter-item { font-size: 12px; }
    .filter-label { font-weight: 600; color: #6b7280; display: block; margin-bottom: 4px; }
    .filter-value { color: #111827; }
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
  <h1>���� Relat+�rio Financeiro</h1>
  <p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>`;

            // Adicionar filtros aplicados
            const appliedFilters: string[] = [];
            const categoryId = this.categoryFilter();
            const professionalId = this.professionalFilter();
            const employmentFilter = this.employmentFilter();
            const startDate = this.startDateFilter();
            const endDate = this.endDateFilter();

            if (categoryId) {
                const category = this.categoriesById().get(categoryId);
                appliedFilters.push(`<div class="filter-item"><span class="filter-label">Categoria:</span><span class="filter-value">${encodeHtml(category?.name || "-")}</span></div>`);
            }

            if (professionalId === "unassigned") {
                appliedFilters.push(`<div class="filter-item"><span class="filter-label">Profissional:</span><span class="filter-value">${encodeHtml(unassignedLabel)}</span></div>`);
            } else if (professionalId && typeof professionalId === "number") {
                const professional = this.usersById().get(professionalId);
                appliedFilters.push(`<div class="filter-item"><span class="filter-label">Profissional:</span><span class="filter-value">${encodeHtml(professional?.name || "-")}</span></div>`);
            }

            if (employmentFilter === "employee") {
                appliedFilters.push(`<div class="filter-item"><span class="filter-label">V+�nculo:</span><span class="filter-value">Funcion+�rio</span></div>`);
            } else if (employmentFilter === "independent") {
                appliedFilters.push(`<div class="filter-item"><span class="filter-label">V+�nculo:</span><span class="filter-value">Prestador</span></div>`);
            }

            if (startDate) {
                const formattedDate = new Date(startDate).toLocaleDateString("pt-PT");
                appliedFilters.push(`<div class="filter-item"><span class="filter-label">Data In+�cio:</span><span class="filter-value">${encodeHtml(formattedDate)}</span></div>`);
            }

            if (endDate) {
                const formattedDate = new Date(endDate).toLocaleDateString("pt-PT");
                appliedFilters.push(`<div class="filter-item"><span class="filter-label">Data Fim:</span><span class="filter-value">${encodeHtml(formattedDate)}</span></div>`);
            }

            if (appliedFilters.length > 0) {
                html += `
  <div class="filters-section">
    <p class="filters-title">Filtros Aplicados</p>
    <div class="filters-grid">
      ${appliedFilters.join("")}
    </div>
  </div>`;
            }

            html += `
  <h2>Gr+�ficos</h2>
  <div class="charts">`;

            if (financialWaterfallChartImage) {
                html += `
    <div class="chart-card">
      <h3>${encodeHtml(financialSummaryTitle)}</h3>
      <img src="${financialWaterfallChartImage}" alt="${encodeHtml(financialSummaryTitle)}" />
            <div class="chart-legend-wrapper">
                <p class="legend-title">${encodedLegendLabel}</p>
                <ul class="chart-legend">
                    <li class="chart-legend-item">
                        <div class="chart-legend-info">
                            <span class="legend-dot" style="background-color:${encodeHtml(this.waterfallColors.total)};"></span>
                            <span>Valor Total</span>
                        </div>
                        <span class="chart-legend-meta">${encodeHtml(formatCurrency(financialWaterfallSummary.totalServiceValue))}</span>
                    </li>
                    <li class="chart-legend-item">
                        <div class="chart-legend-info">
                            <span class="legend-dot" style="background-color:${encodeHtml(this.waterfallColors.reimbursement)};"></span>
                            <span>Reembolso Extras</span>
                        </div>
                        <span class="chart-legend-meta">${encodeHtml(formatCurrency(financialWaterfallSummary.extraReimbursements))}</span>
                    </li>
                    <li class="chart-legend-item">
                        <div class="chart-legend-info">
                            <span class="legend-dot" style="background-color:${encodeHtml(this.waterfallColors.fuelings)};"></span>
                            <span>Abastecimentos</span>
                        </div>
                        <span class="chart-legend-meta">${encodeHtml(formatCurrency(financialWaterfallSummary.fuelingsTotal))}</span>
                    </li>
                    <li class="chart-legend-item">
                        <div class="chart-legend-info">
                            <span class="legend-dot" style="background-color:${encodeHtml(this.waterfallColors.net)};"></span>
                            <span>Valor L+�quido</span>
                        </div>
                        <span class="chart-legend-meta">${encodeHtml(formatCurrency(financialWaterfallSummary.netValue))}</span>
                    </li>
                    <li class="chart-legend-item">
                        <div class="chart-legend-info">
                            <span class="legend-dot" style="background-color:${encodeHtml(this.waterfallColors.net)};"></span>
                            <span>Total de Servi+�os</span>
                        </div>
                        <span class="chart-legend-meta">${encodeHtml(String(financialWaterfallSummary.totalServices))}</span>
                    </li>
                </ul>
            </div>
        </div>`;
            }

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
                        <span class="chart-legend-meta">${encodedQuantityLabel}: ${encodeHtml(String(item.count))} ��� ${encodeHtml(
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

            if (originValuesChartImage) {
                html += `
    <div class="chart-card">
      <h3>Valores por Origem</h3>
      <img src="${originValuesChartImage}" alt="Valores por Origem" />
            ${
                    originValuesLegendItems.length
                            ? `<div class="chart-legend-wrapper">
                <p class="legend-title">${encodedLegendLabel}</p>
                <ul class="chart-legend">
                        ${originValuesLegendItems
                            .map(
                                (item, index) => `
                    <li class="chart-legend-item">
                        <div class="chart-legend-info">
                            <span class="legend-dot" style="background-color:${encodeHtml(this.getOriginColor(item.origin))};"></span>
                            <span>${encodeHtml(item.origin)}</span>
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

            if (serviceOriginChartImage) {
                html += `
    <div class="chart-card">
      <h3>Servi+�os por Origem</h3>
      <img src="${serviceOriginChartImage}" alt="Servi+�os por Origem" />
            ${
                    serviceOriginLegendItems.length
                            ? `<div class="chart-legend-wrapper">
                <p class="legend-title">${encodedLegendLabel}</p>
                <ul class="chart-legend">
                        ${serviceOriginLegendItems
                            .map(
                                (item, index) => `
                    <li class="chart-legend-item">
                        <div class="chart-legend-info">
                            <span class="legend-dot" style="background-color:${encodeHtml(this.getOriginColor(item.origin))};"></span>
                            <span>${encodeHtml(item.origin)}</span>
                        </div>
                        <span class="chart-legend-meta">${encodedQuantityLabel}: ${encodeHtml(String(item.count))} ��� ${encodeHtml(
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
  <h2>Detalhes dos Servi+�os</h2>
  <table>
    <thead>
      <tr>
        <th>${encodeHtml(professionalLabel)}</th>
        <th>${encodeHtml(categoryLabel)}</th>
        <th>Valor Servi+�o (��)</th>
        <th>Valor a pagar (��)</th>
        <th>Valor Pago (��)</th>
        <th>Valor final (��)</th>
      </tr>
    </thead>
    <tbody>`;

                        summaries.forEach((summary) => {
                                const professionalName = encodeHtml(summary.professionalName || unassignedLabel);
                                const categoryName = encodeHtml(summary.categoryName || "-");
                                const serviceValue = encodeHtml(formatCurrency(summary.serviceValue));
                                const paidAmount = encodeHtml(formatCurrency(summary.paidAmount));
                                const pendingAmount = encodeHtml(formatCurrency(summary.pendingAmount));
                                const finalAmount = encodeHtml(formatCurrency(summary.finalAmount));
                                html += `
            <tr class="category-row">
                <td>${professionalName}</td>
                <td>${categoryName}</td>
                <td>${serviceValue}</td>
                <td>${pendingAmount}</td>
                <td>${paidAmount}</td>
                <td><strong>${finalAmount}</strong></td>
            </tr>`;

                                summary.subcategoryBreakdown.forEach((subcategory) => {
                                        const subcategoryName = encodeHtml(subcategory.name || "-");
                                        const subcategoryServiceValue = encodeHtml(formatCurrency(subcategory.serviceValue));
                                        const subcategoryPaidAmount = encodeHtml(formatCurrency(subcategory.paidAmount));
                                        const subcategoryPendingAmount = encodeHtml(formatCurrency(subcategory.pendingAmount));
                                        const subcategoryFinalAmount = encodeHtml(formatCurrency(subcategory.finalAmount));
                                        html += `
            <tr class="subcategory-row">
                <td></td>
                <td><div style="padding-left: 16px;"><span class="row-label">${encodeHtml(subcategoryLabel)}</span>${subcategoryName}</div></td>
                <td>${subcategoryServiceValue}</td>
                <td>${subcategoryPendingAmount}</td>
                <td>${subcategoryPaidAmount}</td>
                <td><strong>${subcategoryFinalAmount}</strong></td>
            </tr>`;

                                        subcategory.services.forEach((service) => {
                                                const serviceTitle = encodeHtml(service.title || "-");
                                                const serviceOriginName = encodeHtml(service.originName || (this.i18n.translate("unknownOrigin") ?? "Origem Desconhecida"));
                                                const serviceOs = encodeHtml(service.os || notApplicableLabel);
                                                const serviceStatus = encodeHtml(service.status || (this.i18n.translate("unknownStatus") ?? "Unknown"));
                                                const serviceStartAt = encodeHtml(service.serviceStartAt ? formatDateTime(service.serviceStartAt) : notApplicableLabel);
                                                const serviceEndAt = encodeHtml(service.serviceEndAt ? formatDateTime(service.serviceEndAt) : notApplicableLabel);
                                                const serviceServiceValue = encodeHtml(formatCurrency(service.serviceValue));
                                                const servicePaidAmount = encodeHtml(formatCurrency(service.paidAmount));
                                                const servicePendingAmount = encodeHtml(formatCurrency(service.pendingAmount));
                                                const serviceFinalAmount = encodeHtml(formatCurrency(service.finalAmount));
                                                html += `
            <tr class="service-row">
                <td></td>
                <td>
                    <div style="padding-left: 32px;">
                        <span class="row-label">${encodeHtml(serviceLabel)}</span>${serviceTitle}
                        <div style="margin-top: 6px;">
                            <span class="row-label">${encodeHtml(originLabel)}</span>${serviceOriginName}
                            <span class="row-label">${encodeHtml(osLabel)}</span>${serviceOs}
                            <span class="row-label">${encodeHtml(statusLabel)}</span>${serviceStatus}
                            <span class="row-label">${encodeHtml(serviceStartLabel)}</span>${serviceStartAt}
                            <span class="row-label">${encodeHtml(serviceEndLabel)}</span>${serviceEndAt}
                        </div>
                    </div>
                </td>
                <td>${serviceServiceValue}</td>
                <td>${servicePendingAmount}</td>
                <td>${servicePaidAmount}</td>
                <td><strong>${serviceFinalAmount}</strong></td>
            </tr>`;
                                        });
                                });
            });

            if (!summaries.length) {
                html += `
      <tr><td colspan="6" style="text-align:center; padding:16px;">${encodeHtml(noDataLabel)}</td></tr>`;
            }

            html += `
    </tbody>
  </table>
  <div class="footer">
    <p>Relat+�rio gerado automaticamente pelo Natan General Service</p>
    <p>-� ${new Date().getFullYear()} Natan General Service</p>
  </div>
</body>
</html>`;

            const printWindow = globalThis.window.open("", "_blank");
            if (!printWindow) {
                this.notificationService.addNotification(
                    this.i18n.translate("popupBlocked") ||
                        "N+�o foi poss+�vel abrir a janela do relat+�rio. Verifique o bloqueador de pop-ups."
                );
                return;
            }

            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();

            // Aguarda o carregamento do logo/imagens antes de imprimir,
            // evitando que o PDF saia sem o logo por timing.
            await this.waitForPrintAssets(printWindow);
            printWindow.focus();
            printWindow.print();
            this.notificationService.addNotification(
                this.i18n.translate("exportSuccessPDF") || "Relat+�rio PDF aberto para impress+�o!"
            );
        } catch (error) {
            console.error("Erro ao exportar PDF:", error);
            this.notificationService.addNotification(
                this.i18n.translate("exportError") || "Erro ao exportar relat+�rio"
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
            return await new Promise<string | null>((resolve, reject) => {
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

    private async tryLoadFirstAvailableImageAsDataUrl(urls: string[]): Promise<string | null> {
        for (const url of urls) {
            const dataUrl = await this.tryLoadImageAsDataUrl(url);
            if (dataUrl) {
                return dataUrl;
            }
        }
        return null;
    }

    private waitForPrintAssets(printWindow: Window, timeoutMs = 2500): Promise<void> {
        return new Promise((resolve) => {
            const startedAt = Date.now();
            const tick = () => {
                if (Date.now() - startedAt >= timeoutMs) {
                    resolve();
                    return;
                }

                try {
                    const doc = printWindow.document;
                    const logo = doc.querySelector<HTMLImageElement>("img.brand-logo");
                    const logoReady = !logo || (logo.complete && logo.naturalWidth > 0);

                    const images = Array.from(doc.images ?? []);
                    const imagesReady = images.every((img) => img.complete);

                    if (logoReady && imagesReady) {
                        resolve();
                        return;
                    }
                } catch {
                    // If we can't inspect the window for any reason, don't block printing.
                    resolve();
                    return;
                }

                setTimeout(tick, 50);
            };

            tick();
        });
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
        // Para consist+�ncia com a Vis+�o Geral do profissional, filtra apenas por scheduled_start_datetime
        return request.scheduled_start_datetime || null;
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
        if (value === "employee" || value === "independent" || value === "all") {
            this.employmentFilter.set(value);
        } else {
            this.employmentFilter.set("all");
        }
        this.resetPagination();
    }

    onStartDateChange(value: string): void {
        this.startDateFilter.set(value || null);
        // As strings de input date est+�o em YYYY-MM-DD (orden+�vel lexicograficamente)
        const endDate = this.endDateFilter();
        if (endDate && value && endDate < value) {
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

    private matchesProfessionalIdFilter(professionalId: number | null | undefined, professionalFilterValue: ProfessionalFilterValue): boolean {
        if (professionalFilterValue === "unassigned") {
            return professionalId === null || professionalId === undefined;
        }
        if (professionalFilterValue === null || professionalFilterValue === undefined) {
            return true;
        }
        return professionalId === professionalFilterValue;
    }

    private matchesEmploymentFilterForProfessionalId(
        professionalId: number | null | undefined,
        employmentFilter: EmploymentFilterValue
    ): boolean {
        if (employmentFilter === "all") {
            return true;
        }
        const hasBond = this.getProfessional(professionalId)?.is_natan_employee === true;
        return employmentFilter === "employee" ? hasBond : !hasBond;
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

        const completionDateStr = this.toLocalDateString(completionDate);
        if (!completionDateStr) {
            return !startDate && !endDate;
        }

        // Compara+�+�o por dia (YYYY-MM-DD) +� inclusiva e evita problemas de hora/timezone.
        if (startDate && completionDateStr < startDate) {
            return false;
        }
        if (endDate && completionDateStr > endDate) {
            return false;
        }
        return true;
    }

    private matchesDateRange(dateValue: string | null | undefined, startDate: string | null, endDate: string | null): boolean {
        if (!dateValue) {
            return !startDate && !endDate;
        }
        const dateStr = this.toLocalDateString(dateValue);
        if (!dateStr) {
            return !startDate && !endDate;
        }
        if (startDate && dateStr < startDate) {
            return false;
        }
        if (endDate && dateStr > endDate) {
            return false;
        }
        return true;
    }
}

