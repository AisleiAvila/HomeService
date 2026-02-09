
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
        return users.filter(u => u.role === 'professional' || u.role === 'professional_almoxarife').sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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
    private readonly integerStats = new Set(["activeServices", "completedServices", "finalizedServices", "scheduledServices", "totalServices"]);
    
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
                .filter(r => this.isPaymentMarkedAsPaid(r.payment_status) && r.completed_at)
                .filter(r => {
                    // verificar profissional selecionado
                    const pro = this.selectedProfessional();
                    if (pro !== 'all' && r.professional_id) {
                        if (Number.parseInt(pro, 10) !== r.professional_id) return false;
                    }

                    const completed = new Date(r.completed_at);
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
                const completed = new Date(r.completed_at);
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
        // Inicializar valores animados com o valor real ao carregar
        effect(() => {
            const stats = this.stats();
            const current = this.animatedValues();
            const newValues: Record<string, number> = { ...current };
            let changed = false;
            stats.forEach(stat => {
                // Só animar valores inteiros, receita total sempre mostra formatCost
                if (this.integerStats.has(stat.id)) {
                    const val = stat.rawValue || 0;
                    if (current[stat.id] !== val) {
                        newValues[stat.id] = val;
                        changed = true;
                    }
                }
            });
            if (changed) {
                this.animatedValues.set(newValues);
            }
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
        // Cards principais: todos os dados vêm de filteredRequests
        const requests = this.filteredRequests();
        const activeServices = requests.filter(r => r.status === 'In Progress' || r.status === 'Em Progresso').length;
        const completedServices = requests.filter(r => r.status === 'Concluído').length;
        const finalizedServices = requests.filter(r => r.status === 'Finalizado').length;
        // Tendências fixas (pode-se implementar lógica real depois)
        const trends = {
            revenue: '+0%',
            approvals: '+0%',
            active: '+0%',
            completed: '+0%',
            finalized: '+0%',
            clients: '+0%'
        };

        // Montar lista de stats/cards
        const scheduledServices = requests.filter(r => r.status === 'Data Definida').length;
        const stats = [
            {
                id: "totalRevenue",
                label: "totalRevenue",
                value: this.formatCost(requests.reduce((sum, r) => sum + this.validateCost(r.valor), 0)),
                rawValue: requests.reduce((sum, r) => sum + this.validateCost(r.valor), 0),
                icon: "fas fa-euro-sign",
                bgColor: "bg-linear-to-br from-green-400 to-green-500 dark:from-green-500 dark:to-green-600 text-white dark:text-white",
                trend: trends.revenue,
                trendColor: trends.revenue.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: this.sparklineData().totalRevenue,
            },
            {
                id: "totalServices",
                label: "totalServices", // Usar chave para tradução
                value: requests.length.toString(),
                rawValue: requests.length,
                icon: "fas fa-list-alt",
                bgColor: "bg-linear-to-br from-purple-400 to-purple-500 dark:from-purple-500 dark:to-purple-600 text-white dark:text-white",
                trend: '+0%',
                trendColor: "text-green-600",
                badge: null,
                sparklineData: [],
            },
            {
                id: "scheduledServices",
                label: "scheduledServices", // Chave para tradução
                value: scheduledServices.toString(),
                rawValue: scheduledServices,
                icon: "fas fa-calendar-alt",
                bgColor: "bg-linear-to-br from-yellow-400 to-yellow-500 dark:from-yellow-500 dark:to-yellow-600 text-white dark:text-white",
                trend: '+0%',
                trendColor: "text-green-600",
                badge: null,
                sparklineData: [],
            },
            {
                id: "activeServices",
                label: "activeServices",
                value: activeServices.toString(),
                rawValue: activeServices,
                icon: "fas fa-tools",
                bgColor: "bg-linear-to-br from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600 text-white dark:text-white",
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
                bgColor: "bg-linear-to-br from-emerald-400 to-emerald-500 dark:from-emerald-500 dark:to-emerald-600 text-white dark:text-white",
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
                bgColor: "bg-linear-to-br from-teal-400 to-teal-500 dark:from-teal-500 dark:to-teal-600 text-white dark:text-white",
                trend: trends.finalized,
                trendColor: trends.finalized.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: [],
            }
        ];

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
            if (this.isPaymentMarkedAsPaid(request.payment_status)) {
                revenueData[categoryName].paid += revenue;
            } else if (!this.isPaymentMarkedAsPaid(request.payment_status)) {
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
        
        const validRequests = filteredRequests.filter(r => 
            r.professional_id && r.valor
        );

        const revenueByPro: Record<string, number> = {};

        validRequests.forEach(request => {
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
        const startVal = Math.round(startStored);
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
        // Valor formatado para receita (sempre usar stat.rawValue para evitar bug de animação)
        if (stat.id === 'totalRevenue') {
            return this.formatCost(stat.rawValue || 0);
        }
        // Valor inteiro animado para contagens
        if (this.integerStats.has(stat.id)) {
            return String(Math.round(this.getAnimatedValue(stat.id)));
        }
        // Valor padrão
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
                // Usa tradução do label se for string chave
                const label = typeof stat.label === 'string' ? this.i18n.translate(stat.label) : stat.label;
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
            printWindow.document.close();
            // Definir o HTML usando innerHTML para evitar o uso de document.write (deprecated)
            printWindow.document.documentElement.innerHTML = html;
            
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

