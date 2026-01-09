import { CommonModule } from "@angular/common";
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
        CommonModule,
        I18nPipe,
        StatusPieChartComponent,
        CategoryBarChartComponent,
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
    
    // Signal para filtro de período centralizado
    selectedPeriod = signal<'all' | '7' | '30' | '90'>('all');
    
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
        const period = this.selectedPeriod();
        const selectedProId = this.selectedProfessional();
        const requests = this.dataService.serviceRequests();
        
        let filtered = requests;

        // Filtrar por período
        if (period !== 'all') {
            const now = new Date();
            const days = Number.parseInt(period, 10);
            const startDate = new Date(now);
            startDate.setDate(startDate.getDate() - days);
            
            // Reseta para comparação apenas de dias (ignora timezone issues)
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);

            console.log(`[filteredRequests] Period filter: ${days} days`);
            console.log(`[filteredRequests] Range: ${startDate.toDateString()} to ${endDate.toDateString()}`);

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
                
                const inRange = requestDate >= startDate && requestDate <= endDate;
                
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
        if (period !== 'all' || selectedProId !== 'all') {
            console.log(`[filteredRequests] FINAL - Period: ${period}, Professional: ${selectedProId}, Results: ${filtered.length}/${requests.length}`);
        }

        return filtered;
    });
    
    // Signals para animação de contagem
    private readonly animatedValues = signal<Record<string, number>>({});
    
    // Signal para modo de visualização compacto
    compactMode = signal(false);
    
    // Signal para dados de sparkline
    sparklineData = computed(() => {
        const now = new Date();
        const last7Days: Record<string, number[]> = {
            totalRevenue: [],
            pendingApprovals: [],
            activeServices: [],
            totalProfessionals: [],
        };
        
        // Gerar dados dos últimos 7 dias - usando filteredRequests para respeitar os filtros selecionados
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Receita por dia (usando filteredRequests para respeitar período/profissional selecionado)
            const dayRevenue = this.filteredRequests()
                .filter(r => r.payment_status === "Paid" && r.completed_at?.startsWith(dateStr))
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
        const completed = requests.filter(
            (r) => (r.status === "Concluído" || r.status === "Finalizado") && r.valor != null
        );
        const totalRevenue = completed
            .filter((r) => this.isPaymentMarkedAsPaid(r.payment_status))
            .reduce((sum, r) => sum + this.validateCost(r.valor), 0);

        const unpaidInProgressStatuses = new Set([
            "Em Progresso",
            "In Progress",
            "Concluído",
            "Finalizado",
        ]);
        const unpaidInProgressRevenue = requests
            .filter((r) => r.valor != null && unpaidInProgressStatuses.has(r.status || ""))
            .filter((r) => !this.isPaymentMarkedAsPaid(r.payment_status))
            .reduce((sum, r) => sum + this.validateCost(r.valor), 0);

        // Calculate active services
        const activeServices = requests.filter(r => r.status !== 'Concluído' && r.status !== 'Finalizado' && r.status !== 'Cancelado').length;

        // Cálculo real das tendências mês a mês
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0); // último dia mês anterior

        // Receita
        const revenueThisMonth = requests
            .filter(r => r.payment_status === "Paid" && r.completed_at && new Date(r.completed_at) >= startOfMonth)
            .reduce((sum, r) => sum + this.validateCost(r.valor), 0);
        const revenueLastMonth = requests
            .filter(r => r.payment_status === "Paid" && r.completed_at && new Date(r.completed_at) >= startOfPrevMonth && new Date(r.completed_at) <= endOfPrevMonth)
            .reduce((sum, r) => sum + this.validateCost(r.valor), 0);
        const revenueTrend = revenueLastMonth > 0
            ? (((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1) + "%"
            : "+0%";

        // Aprovações
        const approvalsThisMonth = professionals.filter(u => u.status === "Active" && u.created_at && new Date(u.created_at) >= startOfMonth).length;
        const approvalsLastMonth = professionals.filter(u => u.status === "Active" && u.created_at && new Date(u.created_at) >= startOfPrevMonth && new Date(u.created_at) <= endOfPrevMonth).length;
        const approvalsTrend = approvalsLastMonth > 0
            ? (((approvalsThisMonth - approvalsLastMonth) / approvalsLastMonth) * 100).toFixed(1) + "%"
            : "+0%";

        // Serviços ativos
        const activeThisMonth = requests.filter(r => r.status !== "Concluído" && r.status !== "Finalizado" && r.status !== "Cancelado" && r.created_at && new Date(r.created_at) >= startOfMonth).length;
        const activeLastMonth = requests.filter(r => r.status !== "Concluído" && r.status !== "Finalizado" && r.status !== "Cancelado" && r.created_at && new Date(r.created_at) >= startOfPrevMonth && new Date(r.created_at) <= endOfPrevMonth).length;
        const activeTrend = activeLastMonth > 0
            ? (((activeThisMonth - activeLastMonth) / activeLastMonth) * 100).toFixed(1) + "%"
            : "+0%";

        // Profissionais ativos
        const professionalsThisMonth = professionals.filter(u => u.status === "Active" && u.created_at && new Date(u.created_at) >= startOfMonth).length;
        const professionalsLastMonth = professionals.filter(u => u.status === "Active" && u.created_at && new Date(u.created_at) >= startOfPrevMonth && new Date(u.created_at) <= endOfPrevMonth).length;
        const professionalsTrend = professionalsLastMonth > 0
            ? (((professionalsThisMonth - professionalsLastMonth) / professionalsLastMonth) * 100).toFixed(1) + "%"
            : "+0%";

        const trends = {
            revenue: revenueTrend,
            approvals: approvalsTrend,
            active: activeTrend,
            professionals: professionalsTrend,
            clients: "+0%", // clientes removidos do sistema
        };

        return [
            {
                id: "totalRevenue",
                label: this.i18n.translate("totalRevenue"),
                value: this.formatCost(totalRevenue),
                rawValue: totalRevenue,
                icon: "fas fa-euro-sign",
                bgColor: "bg-gradient-to-br from-green-400 to-green-500 dark:from-green-500 dark:to-green-600 text-white dark:text-white",
                trend: trends.revenue,
                trendColor: trends.revenue.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: this.sparklineData().totalRevenue,
                unpaidInProgressValue: this.formatCost(unpaidInProgressRevenue),
            },
            {
                id: "pendingApprovals",
                label: this.i18n.translate("pendingApprovals"),
                value: pendingProfessionals.length,
                rawValue: pendingProfessionals.length,
                icon: "fas fa-user-clock",
                bgColor: "bg-gradient-to-br from-orange-400 to-orange-500 dark:from-orange-500 dark:to-orange-600 text-white dark:text-white",
                trend: trends.approvals,
                trendColor: trends.approvals.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: [],
                unpaidInProgressValue: undefined,
            },
            {
                id: "activeServices",
                label: this.i18n.translate("activeServices"),
                value: activeServices,
                rawValue: activeServices,
                icon: "fas fa-tools",
                bgColor: "bg-gradient-to-br from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600 text-white dark:text-white",
                trend: trends.active,
                trendColor: trends.active.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: this.sparklineData().activeServices,
                unpaidInProgressValue: undefined,
            },
            {
                id: "totalProfessionals",
                label: this.i18n.translate("totalProfessionals"),
                value: activeProfessionals.length,
                rawValue: activeProfessionals.length,
                icon: "fas fa-user-tie",
                bgColor: "bg-gradient-to-br from-purple-400 to-purple-500 dark:from-purple-500 dark:to-purple-600 text-white dark:text-white",
                trend: trends.professionals,
                trendColor: trends.professionals.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: [],
                unpaidInProgressValue: undefined,
            },
            // {
            //     id: "activeClients",
            //     label: this.i18n.translate("activeClients"),
            //     value: clients.length,
            //     icon: "fas fa-users",
            //     bgColor: "bg-gradient-to-br from-brand-primary-100 to-indigo-200 text-brand-primary-700",
            //     trend: trends.clients,
            //     trendColor: trends.clients.includes("+") ? "text-green-600" : "text-red-600",
            //     badge: null,
            // },
        ];
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
            case "totalProfessionals":
                this.router.navigate(['/admin/clients']);
                break;
            case "activeClients":
                this.router.navigate(['/admin/clients']);
                break;
        }
    }
    
    // Animação de contagem dos valores
    private animateValue(statId: string, targetValue: number) {
        const duration = 1500; // ms
        const startValue = this.animatedValues()[statId] || 0;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out cubic)
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (targetValue - startValue) * easedProgress;
            
            this.animatedValues.update(values => ({
                ...values,
                [statId]: Math.round(currentValue)
            }));
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    // Obter valor animado para um stat
    getAnimatedValue(statId: string): number {
        return this.animatedValues()[statId] || 0;
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
                    <h1>📊 Relatório de Visão Geral - HomeService</h1>
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
                        <p>Relatório gerado automaticamente pelo sistema HomeService</p>
                        <p>© ${new Date().getFullYear()} HomeService - Natan Construtora</p>
                    </div>
                </body>
                </html>
            `;
            
            // Abrir em nova janela para impressão/salvamento como PDF
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.documentElement.innerHTML = html;
                printWindow.document.close();
                
                // Aguardar carregamento e abrir diálogo de impressão
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                }, 250);
                
                this.notificationService.addNotification(
                    this.i18n.translate('exportSuccessPDF') || 'Relatório PDF aberto para impressão!'
                );
            }
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            this.notificationService.addNotification(
                this.i18n.translate('exportError') || 'Erro ao exportar relatório'
            );
        }
    }
}

