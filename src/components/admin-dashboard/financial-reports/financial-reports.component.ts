
import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { ServiceRequest } from "../../../models/maintenance.models";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { DataService } from "../../../services/data.service";
import { I18nService } from "../../../i18n.service";

@Component({
    selector: "app-financial-reports",
    standalone: true,
    imports: [CommonModule, I18nPipe],
    templateUrl: "./financial-reports.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialReportsComponent {
    private readonly dataService = inject(DataService);
    private readonly i18n = inject(I18nService);

    completedRequests = computed(() =>
        this.dataService.serviceRequests().filter(
            (r) =>
                (r.status === "Finalizado" || r.status === ("Completed" as any)) &&
                r.cost
        )
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

    formatCost(cost: number | undefined): string {
        if (cost === undefined || cost === null) return "€0.00";
        return new Intl.NumberFormat("pt-PT", {
            style: "currency",
            currency: "EUR",
        }).format(cost);
    }

    generateInvoice(req: ServiceRequest) {
        console.log("Generate invoice for:", req);
        // Implement invoice generation logic
    }

    exportToCSV() {
        console.log("Export to CSV");
        // Implement CSV export logic
    }

    getClientName(clientId: number): string {
        return this.dataService.users().find(u => u.id === clientId)?.name || 'N/A';
    }

    getProfessionalName(profId: number | undefined): string {
        if (!profId) return 'N/A';
        return this.dataService.users().find(u => u.id === profId)?.name || 'N/A';
    }
}
