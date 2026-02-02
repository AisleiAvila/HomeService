
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from "@angular/core";
import { Router } from "@angular/router";
import { I18nService } from "../../../i18n.service";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { DataService } from "../../../services/data.service";
import { NotificationService } from "../../../services/notification.service";
import { CategoryBarChartComponent } from "../../category-bar-chart.component";
import { StatusPieChartComponent } from '../../status-pie-chart.component';

@Component({
    selector: "app-admin-overview",
    standalone: true,
    imports: [
    I18nPipe,
    StatusPieChartComponent,
    CategoryBarChartComponent
],
    templateUrl: "./admin-overview.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOverviewComponent implements OnInit {
    private readonly dataService = inject(DataService);
    private readonly i18n = inject(I18nService);
    private readonly router = inject(Router);
    private readonly notificationService = inject(NotificationService);
    
    // Signal para estado de loading
    readonly isLoading = computed(() => this.dataService.isLoading());
    
    // Computed para determinar o período para os gráficos
    chartPeriod = computed(() => {
        return this.startDate() || this.endDate() ? 'custom' : 'all';
    });
    
    // Signals para filtro de data inicial e final
    startDate = signal<string>('');
    endDate = signal<string>('');
    
    // Signal para filtro de profissional
    selectedProfessional = signal<string>('all');
    
    // Computed signal com lista de profissionais disponíveis
    professionalsList = computed(() => {
        const users = this.dataService.users();
        return users.filter(u => u.role === 'professional').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });
    
    // Computed signal para filtrar requests por período e profissional
    // ✅ DEVE SER ANTES de sparklineData e stats que o usam
    filteredRequests = computed(() => {
        const start = this.startDate();
        const end = this.endDate();
        const selectedProId = this.selectedProfessional();
        const requests = this.dataService.serviceRequests();
        
        let filtered = requests;

        // Filtrar por período personalizado
        if (start || end) {
            let startDate: Date | null = null;
            let endDate: Date | null = null;

            if (start) {
                startDate = new Date(start);
                startDate.setHours(0, 0, 0, 0);
            }

            if (end) {
                endDate = new Date(end);
                endDate.setHours(23, 59, 59, 999);
            }

            console.log(`[filteredRequests] Custom period filter: ${startDate?.toDateString()} to ${endDate?.toDateString()}`);

            filtered = filtered.filter(r => {
                // Tentar requested_datetime primeiro, depois requested_date, depois scheduled_date
                const dateToCheck = (r as any).requested_datetime || (r as any).requested_date || (r as any).scheduled_date;
                
                if (!dateToCheck) {
                    console.warn(`[filteredRequests] ID ${r.id}: sem data (requested_datetime/requested_date/scheduled_date)`);
                    return false;
                }
                
                const requestDate = new Date(dateToCheck);
                
                if (Number.isNaN(requestDate.getTime())) {
                    console.warn(`[filteredRequests] ID ${r.id}: data inválida - ${dateToCheck}`);
                    return false;
                }
                
                let inRange = true;
                
                if (startDate) {
                    inRange = inRange && requestDate >= startDate;
                }
                
                if (endDate) {
                    inRange = inRange && requestDate <= endDate;
                }
                
                // Log dos primeiros 5
                if (requests.indexOf(r) < 5) {
                    const dateStr = typeof dateToCheck === 'string' ? dateToCheck.substring(0, 10) : dateToCheck;
                    console.log(`[filteredRequests] ID ${r.id}: ${dateStr} → inRange: ${inRange}`);
                }
                
                return inRange;
            });

            // Se nenhum resultado, fazer debug
            if (filtered.length === 0 && requests.length > 0) {
                console.error(`[filteredRequests] ⚠️ NENHUM RESULTADO! Total de registos: ${requests.length}`);
                console.table(requests.slice(0, 10).map(r => ({
                    id: r.id,
                    requested_datetime: (r as any).requested_datetime ? String((r as any).requested_datetime).substring(0, 10) : 'NULL',
                    requested_date: (r as any).requested_date ? String((r as any).requested_date).substring(0, 10) : 'NULL',
                    scheduled_date: (r as any).scheduled_date ? String((r as any).scheduled_date).substring(0, 10) : 'NULL',
                    status: r.status
                })));
            }
        }

        // Filtrar por profissional
        if (selectedProId !== 'all') {
            // selectedProId vem como string do HTML, professional_id é número
            const proIdToMatch = Number.parseInt(selectedProId, 10);
            filtered = filtered.filter(r => {
                if (!r.professional_id) return false;
                return r.professional_id === proIdToMatch;
            });
        }

        // Debug: Log dos filtros aplicados
        if ((start || end) || selectedProId !== 'all') {
            console.log(`[filteredRequests] FINAL - Start: ${start}, End: ${end}, Professional: ${selectedProId}, Results: ${filtered.length}/${requests.length}`);
        }

        return filtered;
    });
    
    // Signals para animação de contagem
    private readonly animatedValues = signal<Record<string, number>>({});
    // Stats que representam contagens inteiras (não moeda)
    private readonly integerStats = new Set(["activeServices", "completedServices", "finalizedServices"]);
    
    // Signal para modo de visualização compacto
    compactMode = signal(false);
    
    // Signal para dados de sparkline
    sparklineData = computed(() => {
        const now = new Date();
        const last7Days: Record<string, number[]> = {
            totalRevenue: [],
            pendingApprovals: [],
            activeServices: [],
        };
        
        // Gerar dados dos últimos 7 dias - usando filteredRequests para respeitar os filtros selecionados
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Receita por dia (usar completed_at e filtro por profissional)
            const dayRevenue = this.dataService.serviceRequests()
                .filter(r => r.payment_status === "Paid" && r.completed_at)
                .filter(r => {
                    // verificar profissional selecionado
                    const pro = this.selectedProfessional();
                    if (pro !== 'all' && r.professional_id) {
                        if (Number.parseInt(pro, 10) !== r.professional_id) return false;
                    }

                    const completed = new Date(r.completed_at as string);
                    if (Number.isNaN(completed.getTime())) return false;

                    const completedDateStr = completed.toISOString().split('T')[0];
                    return completedDateStr === dateStr;
                })
                .reduce((sum, r) => sum + this.validateCost(r.valor), 0);
            last7Days.totalRevenue.push(dayRevenue);
            
            // Serviços ativos por dia (usando filteredRequests para respeitar período/profissional selecionado)
            const dayActive = this.filteredRequests().filter(r => 
                r.status !== "Concluído" && r.status !== "Finalizado" && r.status !== "Cancelado" && 
                r.created_at?.startsWith(dateStr)
            ).length;
            last7Days.activeServices.push(dayActive);
        }
        
        return last7Days;
    });

    /**
     * Retorna pedidos com `completed_at` filtrados pelo período (startDate/endDate)
     * e pelo `selectedProfessional`.
     */
    private getCompletedRequestsFiltered(): any[] {
        const start = this.startDate();
        const end = this.endDate();
        const selectedProId = this.selectedProfessional();

        let requests = this.dataService.serviceRequests().filter(r => r.completed_at);

        // Filtrar por período usando completed_at (se definido)
        if (start || end) {
            let startDate: Date | null = null;
            let endDate: Date | null = null;

            if (start) {
                startDate = new Date(start);
                startDate.setHours(0, 0, 0, 0);
            }

            if (end) {
                endDate = new Date(end);
                endDate.setHours(23, 59, 59, 999);
            }

            requests = requests.filter(r => {
                const completed = new Date(r.completed_at as string);
                if (Number.isNaN(completed.getTime())) return false;
                if (startDate && completed < startDate) return false;
                if (endDate && completed > endDate) return false;
                return true;
            });
        }

        // Filtrar por profissional
        if (selectedProId !== 'all') {
            const proIdToMatch = Number.parseInt(selectedProId, 10);
            requests = requests.filter(r => r.professional_id === proIdToMatch);
        }

        return requests;
    }
    constructor() {
        // Iniciar animação de contagem dos valores (effect deve estar no construtor)
        effect(() => {
            const stats = this.stats();
            stats.forEach(stat => {
                this.animateValue(stat.id, stat.rawValue || 0);
            });
        });
    }

    ngOnInit() {
        console.log('[AdminOverviewComponent] Inicializando - recarregando dados');
        console.log('[AdminOverviewComponent] Service requests:', this.dataService.serviceRequests().length);
        console.log('[AdminOverviewComponent] Users:', this.dataService.users().length);
        
        // Inicializar filtros de data com o mês corrente para Data Inicial e data corrente para Data Final
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Formatar como YYYY-MM-DD para inputs de data
        const formatDate = (date: Date) => date.toISOString().split('T')[0];
        
        this.startDate.set(formatDate(firstDayOfMonth));
        this.endDate.set(formatDate(now));
        
        console.log(`[AdminOverviewComponent] Filtros inicializados - Start: ${this.startDate()}, End: ${this.endDate()}`);
        
        // Força recarregamento apenas se não houver dados
        if (this.dataService.serviceRequests().length === 0 || this.dataService.users().length === 0) {
            console.log('[AdminOverviewComponent] Dados vazios - forçando reload');
            this.dataService.loadInitialData();
        }
    }

    stats = computed(() => {
        const requests = this.filteredRequests(); // ✅ Use filtered requests based on selected period and professional
        const users = this.dataService.users();

        // Pre-filter users to avoid repeated iterations
        const professionals = users.filter(u => u.role === 'professional');
        const activeProfessionals = professionals.filter(u => u.status === 'Active');
        const pendingProfessionals = professionals.filter(u => u.status === 'Pending' || !u.email_verified);
        // REMOVIDO: Cliente não é mais um papel válido no sistema
        const clients: any[] = [];

        // Calculate financial stats with null safety
        // ✅ Receita Total deve considerar qualquer status da solicitação
        // ✅ Para filtrar por período, usar requested_datetime (conforme solicitado)

        // NOTE: removed display of unpaid in-progress revenue from Total Revenue card

        // Calculate active services
        const activeServices = requests.filter(r => r.status !== 'Concluído' && r.status !== 'Finalizado' && r.status !== 'Cancelado').length;

        // Cálculo da tendência comparando com o período imediatamente anterior
        // Definir período atual com base nos filtros de data (se fornecidos) ou mês corrente
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodStart = this.startDate() ? new Date(this.startDate()) : startOfMonth;
        const periodEnd = this.endDate() ? (() => { const d = new Date(this.endDate()); d.setHours(23,59,59,999); return d; })() : now;

        // Função utilitária para somar receita em um intervalo (inclusive)
        // Usa todos os pedidos da fonte de dados e aplica filtro de profissional se selecionado
        const sumRevenueInRange = (start: Date, end: Date) => {
            const allRequests = this.dataService.serviceRequests();
            const selectedPro = this.selectedProfessional();

            return allRequests
                .filter((r) => r.valor != null)
                .filter((r) => {
                    // aplicar filtro por profissional se necessário
                    if (selectedPro && selectedPro !== 'all') {
                        const proIdToMatch = Number.parseInt(selectedPro, 10);
                        if (!r.professional_id || r.professional_id !== proIdToMatch) return false;
                    }

                    const requestedDateTime = (r as any).requested_datetime;
                    if (!requestedDateTime) return false;

                    const dt = new Date(requestedDateTime);
                    if (Number.isNaN(dt.getTime())) return false;
                    return dt >= start && dt <= end;
                })
                .reduce((sum, r) => sum + this.validateCost(r.valor), 0);
        };

        const totalRevenue = sumRevenueInRange(
            new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate(), 0, 0, 0, 0),
            new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate(), 23, 59, 59, 999)
        );

        const revenueThisPeriod = sumRevenueInRange(
            new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate(), 0, 0, 0, 0),
            new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate(), 23, 59, 59, 999)
        );

        // Calcular período anterior imediatamente antes de periodStart com mesma duração
        const periodDurationMs = (periodEnd.getTime() - periodStart.getTime()) + 1;
        const prevEnd = new Date(periodStart.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - (periodDurationMs - 1));

        const revenuePrevPeriod = sumRevenueInRange(
            new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate(), 0, 0, 0, 0),
            new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate(), 23, 59, 59, 999)
        );

        const revenueTrend = revenuePrevPeriod > 0
            ? (((revenueThisPeriod - revenuePrevPeriod) / revenuePrevPeriod) * 100).toFixed(1) + "%"
            : "+0%";

        // Aprovações (comparar com período anterior de mesma duração)
        const approvalsThisPeriod = professionals.filter(u => u.status === "Active" && u.created_at && new Date(u.created_at) >= periodStart && new Date(u.created_at) <= periodEnd).length;
        const approvalsPrevPeriod = professionals.filter(u => u.status === "Active" && u.created_at && new Date(u.created_at) >= prevStart && new Date(u.created_at) <= prevEnd).length;
        const approvalsTrend = approvalsPrevPeriod > 0
            ? (((approvalsThisPeriod - approvalsPrevPeriod) / approvalsPrevPeriod) * 100).toFixed(1) + "%"
            : "+0%";

        // Tendências baseadas no mesmo critério de data do filtro principal.
        // - Se o utilizador filtra por período, o dashboard usa requested_datetime/requested_date/scheduled_date.
        // - Os trends devem seguir o mesmo critério, e não created_at.
        const countRequestsInRange = (predicate: (r: any) => boolean, start: Date, end: Date) => {
            const allRequests = this.dataService.serviceRequests();
            const selectedPro = this.selectedProfessional();

            return allRequests
                .filter(r => {
                    if (!predicate(r)) return false;

                    // aplicar filtro por profissional se necessário
                    if (selectedPro && selectedPro !== 'all') {
                        const proIdToMatch = Number.parseInt(selectedPro, 10);
                        if (!r.professional_id || r.professional_id !== proIdToMatch) return false;
                    }

                    // mesma ordem de prioridade do filteredRequests
                    const dateToCheck = (r as any).requested_datetime || (r as any).requested_date || (r as any).scheduled_date;
                    if (!dateToCheck) return false;

                    const requestDate = new Date(dateToCheck);
                    if (Number.isNaN(requestDate.getTime())) return false;

                    return requestDate >= start && requestDate <= end;
                }).length;
        };

        // Serviços ativos
        const activeThisPeriod = countRequestsInRange(
            (r) => r.status !== "Concluído" && r.status !== "Finalizado" && r.status !== "Cancelado",
            new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate(), 0, 0, 0, 0),
            new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate(), 23, 59, 59, 999)
        );

        const activePrevPeriod = countRequestsInRange(
            (r) => r.status !== "Concluído" && r.status !== "Finalizado" && r.status !== "Cancelado",
            new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate(), 0, 0, 0, 0),
            new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate(), 23, 59, 59, 999)
        );

        const activeTrend = activePrevPeriod > 0
            ? (((activeThisPeriod - activePrevPeriod) / activePrevPeriod) * 100).toFixed(1) + "%"
            : "+0%";

        // Serviços concluídos
        const completedThisPeriod = countRequestsInRange(
            (r) => r.status === "Concluído",
            new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate(), 0, 0, 0, 0),
            new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate(), 23, 59, 59, 999)
        );

        const completedPrevPeriod = countRequestsInRange(
            (r) => r.status === "Concluído",
            new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate(), 0, 0, 0, 0),
            new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate(), 23, 59, 59, 999)
        );

        const completedTrend = completedPrevPeriod > 0
            ? (((completedThisPeriod - completedPrevPeriod) / completedPrevPeriod) * 100).toFixed(1) + "%"
            : "+0%";

        // Serviços finalizados
        const finalizedThisPeriod = countRequestsInRange(
            (r) => r.status === "Finalizado",
            new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate(), 0, 0, 0, 0),
            new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate(), 23, 59, 59, 999)
        );

        const finalizedPrevPeriod = countRequestsInRange(
            (r) => r.status === "Finalizado",
            new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate(), 0, 0, 0, 0),
            new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate(), 23, 59, 59, 999)
        );

        const finalizedTrend = finalizedPrevPeriod > 0
            ? (((finalizedThisPeriod - finalizedPrevPeriod) / finalizedPrevPeriod) * 100).toFixed(1) + "%"
            : "+0%";

        const trends = {
            revenue: revenueTrend,
            approvals: approvalsTrend,
            active: activeTrend,
            completed: completedTrend,
            finalized: finalizedTrend,
            clients: "+0%", // clientes removidos do sistema
        };

        // Calcular serviços concluídos e finalizados
        const completedServices = requests.filter(r => r.status === "Concluído").length;
        const finalizedServices = requests.filter(r => r.status === "Finalizado").length;

        // Criar lista dinâmica de stats
        const stats = [
            {
                id: "totalRevenue",
                label: "totalRevenue",
                value: this.formatCost(totalRevenue),
                rawValue: totalRevenue,
                icon: "fas fa-euro-sign",
                bgColor: "bg-gradient-to-br from-green-400 to-green-500 dark:from-green-500 dark:to-green-600 text-white dark:text-white",
                trend: trends.revenue,
                trendColor: trends.revenue.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: this.sparklineData().totalRevenue,
            }
        ];

        // Adicionar card de aprovações pendentes apenas se houver pendências
        if (pendingProfessionals.length > 0) {
            stats.push({
                id: "pendingApprovals",
                label: "pendingApprovals",
                value: pendingProfessionals.length.toString(),
                rawValue: pendingProfessionals.length,
                icon: "fas fa-user-clock",
                bgColor: "bg-gradient-to-br from-orange-400 to-orange-500 dark:from-orange-500 dark:to-orange-600 text-white dark:text-white",
                trend: trends.approvals,
                trendColor: trends.approvals.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: [],
            });
        }

        // Adicionar demais cards
        stats.push(
            {
                id: "activeServices",
                label: "activeServices",
                value: activeServices.toString(),
                rawValue: activeServices,
                icon: "fas fa-tools",
                bgColor: "bg-gradient-to-br from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600 text-white dark:text-white",
                trend: trends.active,
                trendColor: trends.active.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: this.sparklineData().activeServices,
            },
            {
                id: "completedServices",
                label: "Serviços Concluídos",
                value: completedServices.toString(),
                rawValue: completedServices,
                icon: "fas fa-check-circle",
                bgColor: "bg-gradient-to-br from-emerald-400 to-emerald-500 dark:from-emerald-500 dark:to-emerald-600 text-white dark:text-white",
                trend: trends.completed,
                trendColor: trends.completed.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: [],
            },
            {
                id: "finalizedServices",
                label: "Serviços Finalizados",
                value: finalizedServices.toString(),
                rawValue: finalizedServices,
                icon: "fas fa-check-double",
                bgColor: "bg-gradient-to-br from-teal-400 to-teal-500 dark:from-teal-500 dark:to-teal-600 text-white dark:text-white",
                trend: trends.finalized,
                trendColor: trends.finalized.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: [],
            }
        );

        return stats;
    });

    statusPieChartData = computed(() => {
        const counts: Record<string, number> = {};
        for (const r of this.filteredRequests()) {
            const status = r.status || 'Unknown';
            counts[status] = (counts[status] || 0) + 1;
        }
        // Filtrar apenas status com contagem > 0 para evitar segmentos vazios no gráfico
        return Object.fromEntries(
            Object.entries(counts).filter(([_, count]) => count > 0)
        );
    });

    statusLabels = computed(() => {
        return {
            'Solicitado': this.i18n.translate('statusRequested'),
            'Atribuído': this.i18n.translate('statusAssigned'),
            'Aguardando Confirmação': this.i18n.translate('statusAwaitingConfirmation'),
            'Aceito': this.i18n.translate('statusAccepted'),
            'Recusado': this.i18n.translate('statusRejected'),
            'Data Definida': this.i18n.translate('statusScheduled'),
            'Em Progresso': this.i18n.translate('in_progress'),
            'Concluído': this.i18n.translate('statusCompleted'),
            'Cancelado': this.i18n.translate('statusCancelled'),
            'In Progress': this.i18n.translate('in_progress'),
            'Unknown': 'Unknown'
        };
    });

    ordersByCategory = computed(() => {
        const categories = this.dataService.categories();
        const counts: Record<string, number> = {};
        const filteredRequests = this.filteredRequests();

        for (const r of filteredRequests) {
            if (r.category_id) {
                const category = categories.find(c => c.id === r.category_id);
                const categoryName = category?.name || `Category ${r.category_id}`;
                counts[categoryName] = (counts[categoryName] || 0) + 1;
            } else {
                counts['Unknown'] = (counts['Unknown'] || 0) + 1;
            }
        }
        return counts;
    });

    temporalData = computed(() => {
        const requests = this.dataService.serviceRequests();
        const counts: Record<string, number> = {};

        for (const r of requests) {
            if (r.created_at) {
                const date = new Date(r.created_at).toISOString().split('T')[0];
                counts[date] = (counts[date] || 0) + 1;
            }
        }

        // Sort by date to ensure proper chronological order in charts
        const sortedCounts: Record<string, number> = {};
        const sortedDates = Object.keys(counts)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        for (const date of sortedDates) {
            sortedCounts[date] = counts[date];
        }

        return sortedCounts;
    });

    // Receita por categoria - com duas colunas: valores pagos e pendentes
    revenueByCategory = computed(() => {
        const filteredRequests = this.filteredRequests();
        
        // Estrutura para armazenar dados de duas colunas por categoria
        const revenueData: Record<string, { paid: number; pending: number }> = {};

        filteredRequests.forEach(request => {
            if (!request.valor) return;
            
            const categoryName = request.category?.name || 'Outros';
            const revenue = this.validateCost(request.valor);

            if (!revenueData[categoryName]) {
                revenueData[categoryName] = { paid: 0, pending: 0 };
            }

            // Separar valores pagos e pendentes
            if (request.payment_status === 'Paid') {
                revenueData[categoryName].paid += revenue;
            } else if (request.payment_status === 'Pending' || request.payment_status === 'Unpaid' || request.payment_status === 'Processing') {
                revenueData[categoryName].pending += revenue;
            }
        });

        // Converter para formato esperado pelo gráfico: { "categoria - Pago": number, "categoria - Pendente": number }
        const chartData: Record<string, number> = {};
        
        Object.entries(revenueData).forEach(([category, values]) => {
            if (values.paid > 0) {
                // Formatar com 2 casas decimais
                chartData[`${category} - Pago`] = Math.round(values.paid * 100) / 100;
            }
            if (values.pending > 0) {
                // Formatar com 2 casas decimais
                chartData[`${category} - Pendente`] = Math.round(values.pending * 100) / 100;
            }
        });

        return chartData;
    });

    // Receita por profissional
    revenueByProfessional = computed(() => {
        const filteredRequests = this.filteredRequests();
        const users = this.dataService.users();
        
        const paidRequests = filteredRequests.filter(r => 
            r.payment_status === 'Paid' && r.professional_id && r.valor
        );

        const revenueByPro: Record<string, number> = {};

        paidRequests.forEach(request => {
            const professional = users.find(u => u.id === request.professional_id);
            const proName = professional ? professional.name : 'Desconhecido';
            const revenue = this.validateCost(request.valor);

            if (!revenueByPro[proName]) {
                revenueByPro[proName] = 0;
            }
            revenueByPro[proName] += revenue;
        });

        return revenueByPro;
    });

    /**
     * Validates and returns a safe cost value
     */
    private validateCost(cost: number | undefined | null): number {
        return (cost != null && !Number.isNaN(cost)) ? cost : 0;
    }

    private isPaymentMarkedAsPaid(status: string | null | undefined): boolean {
        if (!status) {
            return false;
        }
        const normalized = status.toLowerCase();
        return normalized === "paid" || normalized === "pagamento feito" || normalized === "pago";
    }

    formatCost(cost: number): string {
        return new Intl.NumberFormat("pt-PT", {
            style: "currency",
            currency: "EUR",
        }).format(cost);
    }

    handleCardClick(statId: string) {
        switch (statId) {
            case "totalRevenue":
                this.router.navigate(['/admin/finances']);
                break;
            case "pendingApprovals":
                this.router.navigate(['/admin/approvals']);
                break;
            case "activeServices":
                this.router.navigate(['/admin/requests']);
                break;
            case "activeClients":
                this.router.navigate(['/admin/clients']);
                break;
        }
    }
    
    // Animação de contagem dos valores
    private animateValue(statId: string, targetValue: number) {
        const duration = 1500; // ms

        const isInteger = this.integerStats.has(statId);

        const startStored = this.animatedValues()[statId] || 0;
        const startVal = isInteger ? Math.round(startStored) : Math.round(startStored);
        const targetVal = isInteger ? Math.round(targetValue) : Math.round(targetValue * 100);
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out cubic)
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startVal + (targetVal - startVal) * easedProgress);

            this.animatedValues.update(values => ({
                ...values,
                [statId]: current
            }));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }
    
    // Obter valor animado para um stat
    getAnimatedValue(statId: string): number {
        const stored = this.animatedValues()[statId];
        if (stored == null) return 0;
        if (this.integerStats.has(statId)) {
            return stored; // já armazenado como inteiro
        }
        return stored / 100; // armazenado em centavos para moeda
    }

    // Retorna o valor exibido no card (formatado ou inteiro)
    displayValue(stat: any): string {
        if (!stat) return '';
        if (stat.id === 'totalRevenue') {
            return this.formatCost(this.getAnimatedValue(stat.id));
        }
        if (this.integerStats.has(stat.id)) {
            return String(Math.round(this.getAnimatedValue(stat.id)));
        }
        return stat.value;
    }
    
    // Desenhar mini gráfico sparkline
    drawSparkline(canvasId: string, data: number[], color: string) {
        setTimeout(() => {
            const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            // Aplicar devicePixelRatio para melhorar nitidez
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            
            const width = rect.width;
            const height = rect.height;
            const padding = 2;
            
            ctx.clearRect(0, 0, width, height);
            
            if (data.length === 0) return;
            
            const max = Math.max(...data, 1);
            const min = Math.min(...data, 0);
            const range = max - min || 1;
            
            // Desenhar linha
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            data.forEach((value, index) => {
                const x = padding + (index / (data.length - 1)) * (width - padding * 2);
                const y = height - padding - ((value - min) / range) * (height - padding * 2);
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
            
            // Área preenchida
            ctx.lineTo(width - padding, height - padding);
            ctx.lineTo(padding, height - padding);
            ctx.closePath();
            
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, color + '40'); // 25% opacity
            gradient.addColorStop(1, color + '00'); // 0% opacity
            
            ctx.fillStyle = gradient;
            ctx.fill();
        }, 100);
    }
    
    // Toggle modo compacto
    toggleCompactMode() {
        this.compactMode.update(mode => !mode);
    }
    
    // Exportar dados como CSV
    async exportToCSV() {
        try {
            const stats = this.stats();
            
            // Cabeçalhos CSV
            let csv = 'Estatísticas Gerais\n\n';
            csv += 'Métrica,Valor,Tendência\n';
            
            stats.forEach(stat => {
                const label = this.i18n.translate(stat.label);
                csv += `"${label}","${stat.value}","${stat.trend}"\n`;
            });
            
            csv += '\n\nSolicitações por Status\n\n';
            csv += 'Status,Quantidade\n';
            Object.entries(this.statusPieChartData()).forEach(([status, count]) => {
                csv += `"${status}","${count}"\n`;
            });
            
            csv += '\n\nSolicitações por Categoria\n\n';
            csv += 'Categoria,Quantidade\n';
            Object.entries(this.ordersByCategory()).forEach(([category, count]) => {
                csv += `"${category}","${count}"\n`;
            });
            
            // Download CSV
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().split('T')[0];
            
            link.setAttribute('href', url);
            link.setAttribute('download', `relatorio-overview-${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            this.notificationService.addNotification(
                this.i18n.translate('exportSuccessCSV') || 'Relatório CSV exportado com sucesso!'
            );
        } catch (error) {
            console.error('Erro ao exportar CSV:', error);
            this.notificationService.addNotification(
                this.i18n.translate('exportError') || 'Erro ao exportar relatório'
            );
        }
    }
    
    // Exportar dados como PDF
    async exportToPDF() {
        try {
            const stats = this.stats();
            
            // Criar HTML para impressão
            let html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Relatório Overview - ${new Date().toLocaleDateString('pt-PT')}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                            color: #333;
                        }
                        h1 {
                            color: #ea5455;
                            border-bottom: 3px solid #ea5455;
                            padding-bottom: 10px;
                        }
                        h2 {
                            color: #475569;
                            margin-top: 30px;
                            border-bottom: 2px solid #e5e7eb;
                            padding-bottom: 5px;
                        }
                        .stats-grid {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 20px;
                            margin: 20px 0;
                        }
                        .stat-card {
                            border: 1px solid #e5e7eb;
                            border-radius: 8px;
                            padding: 15px;
                            background: #f9fafb;
                        }
                        .stat-label {
                            font-size: 14px;
                            color: #6b7280;
                            margin-bottom: 5px;
                        }
                        .stat-value {
                            font-size: 24px;
                            font-weight: bold;
                            color: #111827;
                            margin-bottom: 5px;
                        }
                        .stat-trend {
                            font-size: 12px;
                            font-weight: 600;
                        }
                        .trend-positive { color: #059669; }
                        .trend-negative { color: #dc2626; }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                        }
                        th, td {
                            border: 1px solid #e5e7eb;
                            padding: 12px;
                            text-align: left;
                        }
                        th {
                            background: #f3f4f6;
                            font-weight: 600;
                        }
                        .footer {
                            margin-top: 40px;
                            text-align: center;
                            color: #6b7280;
                            font-size: 12px;
                            border-top: 1px solid #e5e7eb;
                            padding-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <h1>📊 Relatório de Visão Geral - Natan General Service</h1>
                    <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-PT', { 
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                    })}</p>
                    
                    <h2>📈 Estatísticas Principais</h2>
                    <div class="stats-grid">
            `;
            
            stats.forEach(stat => {
                const trendClass = stat.trend.includes('+') ? 'trend-positive' : 'trend-negative';
                html += `
                    <div class="stat-card">
                        <div class="stat-label">${this.i18n.translate(stat.label)}</div>
                        <div class="stat-value">${stat.value}</div>
                        <div class="stat-trend ${trendClass}">
                            ${stat.trend} vs Mês Anterior
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                    
                    <h2>📋 Solicitações por Status</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Quantidade</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            Object.entries(this.statusPieChartData()).forEach(([status, count]) => {
                html += `
                    <tr>
                        <td>${status}</td>
                        <td><strong>${count}</strong></td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                    
                    <h2>🏷️ Solicitações por Categoria</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Categoria</th>
                                <th>Quantidade</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            Object.entries(this.ordersByCategory()).forEach(([category, count]) => {
                html += `
                    <tr>
                        <td>${category}</td>
                        <td><strong>${count}</strong></td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                    
                    <div class="footer">
                        <p>Relatório gerado automaticamente pelo sistema Natan General Service</p>
                        <p>© ${new Date().getFullYear()} Natan General Service - Natan Construtora</p>
                    </div>
                </body>
                </html>
            `;
            
            // Abrir em nova janela para impressão/salvamento como PDF
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                this.notificationService.addNotification(
                    this.i18n.translate('popupBlocked') ||
                        'Não foi possível abrir a janela do relatório. Verifique o bloqueador de pop-ups.'
                );
                return;
            }

            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Aguardar carregamento e abrir diálogo de impressão
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 250);
            
            this.notificationService.addNotification(
                this.i18n.translate('exportSuccessPDF') || 'Relatório PDF aberto para impressão!'
            );
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            this.notificationService.addNotification(
                this.i18n.translate('exportError') || 'Erro ao exportar relatório'
            );
        }
    }
}

