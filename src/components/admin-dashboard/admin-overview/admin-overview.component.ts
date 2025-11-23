
import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { Router } from "@angular/router";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { DataService } from "../../../services/data.service";
import { I18nService } from "../../../i18n.service";
import { StatusPieChartComponent } from "../../status-pie-chart.component";
import { CategoryBarChartComponent } from "../../category-bar-chart.component";
import { TemporalEvolutionChartComponent } from "../../temporal-evolution-chart.component";

@Component({
    selector: "app-admin-overview",
    standalone: true,
    imports: [
        CommonModule,
        I18nPipe,
        StatusPieChartComponent,
        CategoryBarChartComponent,
        TemporalEvolutionChartComponent,
    ],
    templateUrl: "./admin-overview.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOverviewComponent {
    private readonly dataService = inject(DataService);
    private readonly i18n = inject(I18nService);
    private readonly router = inject(Router);

    stats = computed(() => {
        const requests = this.dataService.serviceRequests();
        const users = this.dataService.users();

        // Pre-filter users to avoid repeated iterations
        const professionals = users.filter(u => u.role === 'professional');
        const activeProfessionals = professionals.filter(u => u.status === 'Active');
        const pendingProfessionals = professionals.filter(u => u.status === 'Pending' || !u.email_verified);
        const clients = users.filter(u => u.role === 'client');

        // Calculate financial stats with null safety
        const completed = requests.filter(
            (r) => (r.status === "Finalizado" || r.status === ("Completed" as any)) && r.cost != null
        );
        const totalRevenue = completed
            .filter((r) => r.payment_status === "Paid")
            .reduce((sum, r) => sum + (this.validateCost(r.cost)), 0);

        // Calculate active services
        const activeServices = requests.filter(r => r.status !== 'Finalizado' && r.status !== 'Cancelado').length;

        // Calculate trends (simulated for now - will be replaced with real calculation)
        const trends = {
            revenue: "+12.5%",
            approvals: "-5%",
            active: "+8%",
            professionals: "+2",
            clients: "+15%",
        };

        return [
            {
                id: "totalRevenue",
                label: this.i18n.translate("totalRevenue"),
                value: this.formatCost(totalRevenue),
                icon: "fas fa-euro-sign",
                bgColor: "bg-gradient-to-br from-green-100 to-green-200 text-green-700",
                trend: trends.revenue,
                trendColor: trends.revenue.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
            },
            {
                id: "pendingApprovals",
                label: this.i18n.translate("pendingApprovals"),
                value: pendingProfessionals.length,
                icon: "fas fa-user-clock",
                bgColor: "bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700",
                trend: trends.approvals,
                trendColor: trends.approvals.includes("+") ? "text-green-600" : "text-red-600",
                badge: pendingProfessionals.length > 0 ? this.i18n.translate("new") : null,
            },
            {
                id: "activeServices",
                label: this.i18n.translate("activeServices"),
                value: activeServices,
                icon: "fas fa-tools",
                bgColor: "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700",
                trend: trends.active,
                trendColor: trends.active.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
            },
            {
                id: "totalProfessionals",
                label: this.i18n.translate("totalProfessionals"),
                value: activeProfessionals.length,
                icon: "fas fa-user-tie",
                bgColor: "bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700",
                trend: trends.professionals,
                trendColor: trends.professionals.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
            },
            {
                id: "activeClients",
                label: this.i18n.translate("activeClients"),
                value: clients.length,
                icon: "fas fa-users",
                bgColor: "bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700",
                trend: trends.clients,
                trendColor: trends.clients.includes("+") ? "text-green-600" : "text-red-600",
                badge: null,
            },
        ];
    });

    statusPieChartData = computed(() => {
        const requests = this.dataService.serviceRequests();
        const counts: Record<string, number> = {};
        requests.forEach(r => {
            const status = r.status || 'Unknown';
            counts[status] = (counts[status] || 0) + 1;
        });
        return counts;
    });

    ordersByCategory = computed(() => {
        const requests = this.dataService.serviceRequests();
        const categories = this.dataService.categories();
        const counts: Record<string, number> = {};

        requests.forEach(r => {
            if (r.category_id) {
                const category = categories.find(c => c.id === r.category_id);
                const categoryName = category?.name || `Category ${r.category_id}`;
                counts[categoryName] = (counts[categoryName] || 0) + 1;
            } else {
                counts['Unknown'] = (counts['Unknown'] || 0) + 1;
            }
        });
        return counts;
    });

    temporalData = computed(() => {
        const requests = this.dataService.serviceRequests();
        const counts: Record<string, number> = {};

        requests.forEach(r => {
            if (r.created_at) {
                const date = new Date(r.created_at).toISOString().split('T')[0];
                counts[date] = (counts[date] || 0) + 1;
            }
        });

        // Sort by date to ensure proper chronological order in charts
        const sortedCounts: Record<string, number> = {};
        Object.keys(counts)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            .forEach(date => {
                sortedCounts[date] = counts[date];
            });

        return sortedCounts;
    });

    /**
     * Validates and returns a safe cost value
     */
    private validateCost(cost: number | undefined | null): number {
        return (cost != null && !isNaN(cost)) ? cost : 0;
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
}
