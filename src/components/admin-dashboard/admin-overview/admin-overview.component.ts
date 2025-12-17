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
    
    // Signals para animação de contagem
    private animatedValues = signal<Record<string, number>>({});
    
    // Signal para modo de visualização compacto
    compactMode = signal(false);
    
    // Signal para dados de sparkline
    sparklineData = computed(() => {
        const requests = this.dataService.serviceRequests();
        const now = new Date();
        const last7Days: Record<string, number[]> = {
            totalRevenue: [],
            pendingApprovals: [],
            activeServices: [],
            totalProfessionals: [],
        };
        
        // Gerar dados dos últimos 7 dias
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Receita por dia
            const dayRevenue = requests
                .filter(r => r.payment_status === "Paid" && r.completed_at?.startsWith(dateStr))
                .reduce((sum, r) => sum + this.validateCost(r.valor), 0);
            last7Days.totalRevenue.push(dayRevenue);
            
            // Serviços ativos por dia
            const dayActive = requests.filter(r => 
                r.status !== "Concluído" && r.status !== "Cancelado" && 
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
        const requests = this.dataService.serviceRequests();
        const users = this.dataService.users();

        // Pre-filter users to avoid repeated iterations
        const professionals = users.filter(u => u.role === 'professional');
        const activeProfessionals = professionals.filter(u => u.status === 'Active');
        const pendingProfessionals = professionals.filter(u => u.status === 'Pending' || !u.email_verified);
        // REMOVIDO: Cliente não é mais um papel válido no sistema
        const clients: any[] = [];

        // Calculate financial stats with null safety
        const completed = requests.filter(
            (r) => (r.status === "Concluído" || r.status === ("Completed" as any)) && r.valor != null
        );
        const totalRevenue = completed
            .filter((r) => r.payment_status === "Paid")
            .reduce((sum, r) => sum + this.validateCost(r.valor), 0);

        // Calculate active services
        const activeServices = requests.filter(r => r.status !== 'Concluído' && r.status !== 'Cancelado').length;

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
        const activeThisMonth = requests.filter(r => r.status !== "Concluído" && r.status !== "Cancelado" && r.created_at && new Date(r.created_at) >= startOfMonth).length;
        const activeLastMonth = requests.filter(r => r.status !== "Concluído" && r.status !== "Cancelado" && r.created_at && new Date(r.created_at) >= startOfPrevMonth && new Date(r.created_at) <= endOfPrevMonth).length;
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
                bgColor: "bg-gradient-to-br from-green-100 to-green-200 text-green-700",
                trend: trends.revenue,
                trendColor: trends.revenue.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: this.sparklineData().totalRevenue,
            },
            {
                id: "pendingApprovals",
                label: this.i18n.translate("pendingApprovals"),
                value: pendingProfessionals.length,
                rawValue: pendingProfessionals.length,
                icon: "fas fa-user-clock",
                bgColor: "bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700",
                trend: trends.approvals,
                trendColor: trends.approvals.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: [],
            },
            {
                id: "activeServices",
                label: this.i18n.translate("activeServices"),
                value: activeServices,
                rawValue: activeServices,
                icon: "fas fa-tools",
                bgColor: "bg-gradient-to-br from-brand-primary-100 to-brand-primary-200 text-brand-primary-700",
                trend: trends.active,
                trendColor: trends.active.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: this.sparklineData().activeServices,
            },
            {
                id: "totalProfessionals",
                label: this.i18n.translate("totalProfessionals"),
                value: activeProfessionals.length,
                rawValue: activeProfessionals.length,
                icon: "fas fa-user-tie",
                bgColor: "bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700",
                trend: trends.professionals,
                trendColor: trends.professionals.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
                sparklineData: [],
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
        const requests = this.dataService.serviceRequests();
        const counts: Record<string, number> = {};
        for (const r of requests) {
            const status = r.status || 'Unknown';
            counts[status] = (counts[status] || 0) + 1;
        }
        return counts;
    });

    ordersByCategory = computed(() => {
        const requests = this.dataService.serviceRequests();
        const categories = this.dataService.categories();
        const counts: Record<string, number> = {};

        for (const r of requests) {
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

    // Tempo médio de conclusão por tipo de serviço
    avgCompletionTimeByService = computed(() => {
        const requests = this.dataService.serviceRequests();
        const completedRequests = requests.filter(r => 
            r.status === 'Concluído' && 
            r.actual_start_datetime && 
            r.actual_end_datetime
        );

        const timeByCategory: Record<string, { total: number; count: number }> = {};

        completedRequests.forEach(request => {
            const categoryName = request.category?.name || 'Outros';
            const start = new Date(request.actual_start_datetime!).getTime();
            const end = new Date(request.actual_end_datetime!).getTime();
            const durationHours = (end - start) / (1000 * 60 * 60); // em horas

            if (!timeByCategory[categoryName]) {
                timeByCategory[categoryName] = { total: 0, count: 0 };
            }
            timeByCategory[categoryName].total += durationHours;
            timeByCategory[categoryName].count += 1;
        });

        // Retornar média em horas com rótulo formatado
        const result: Record<string, number> = {};
        Object.entries(timeByCategory).forEach(([category, data]) => {
            const avgHours = data.total / data.count;
            result[category] = Math.round(avgHours * 10) / 10; // 1 casa decimal
        });

        return result;
    });

    // Receita por categoria
    revenueByCategory = computed(() => {
        const requests = this.dataService.serviceRequests();
        const paidRequests = requests.filter(r => 
            r.payment_status === 'Paid' && r.valor
        );

        const revenueByCategory: Record<string, number> = {};

        paidRequests.forEach(request => {
            const categoryName = request.category?.name || 'Outros';
            const revenue = this.validateCost(request.valor);

            if (!revenueByCategory[categoryName]) {
                revenueByCategory[categoryName] = 0;
            }
            revenueByCategory[categoryName] += revenue;
        });

        return revenueByCategory;
    });

    // Receita por profissional
    revenueByProfessional = computed(() => {
        const requests = this.dataService.serviceRequests();
        const users = this.dataService.users();
        
        const paidRequests = requests.filter(r => 
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
                this.router.navigate(['/admin/professionals']);
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
            
            const width = canvas.width;
            const height = canvas.height;
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
            const requests = this.dataService.serviceRequests();
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
            document.body.removeChild(link);
            
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
                printWindow.document.write(html);
                printWindow.document.close();
                
                // Aguardar carregamento e abrir diálogo de impressão
                printWindow.onload = () => {
                    printWindow.focus();
                    printWindow.print();
                };
                
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

