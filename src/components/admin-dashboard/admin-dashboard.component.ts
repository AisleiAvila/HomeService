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
import { User, ServiceCategory } from "../../models/maintenance.models";
import { I18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  template: `
    <div class="space-y-6">
      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (stat of stats(); track stat.label) {
        <div class="bg-white p-6 rounded-lg shadow-md flex items-center">
          <div class="bg-indigo-100 text-indigo-600 rounded-full p-3 mr-4">
            <i class="text-2xl" [class]="stat.icon"></i>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-gray-800">{{ stat.value }}</p>
          </div>
        </div>
        }
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Pending Professional Approvals -->
        <div class="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            {{ "pendingApprovals" | i18n }}
          </h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th scope="col" class="relative px-6 py-3">
                    <span class="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (user of pendingProfessionals(); track user.id) {
                <tr>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                  >
                    {{ user.name }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ user.email }}
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2"
                  >
                    <button
                      (click)="handleApproval(user, true)"
                      class="text-green-600 hover:text-green-900"
                    >
                      Approve
                    </button>
                    <button
                      (click)="handleApproval(user, false)"
                      class="text-red-600 hover:text-red-900"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
                } @empty {
                <tr>
                  <td
                    colspan="3"
                    class="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No pending approvals.
                  </td>
                </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Category Management & Reporting -->
        <div class="space-y-6">
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">
              Manage Categories
            </h3>
            <ul class="space-y-2 mb-4">
              @for (category of categories(); track category) {
              <li
                class="flex justify-between items-center bg-gray-50 p-2 rounded"
              >
                <span class="text-sm text-gray-700">{{ category }}</span>
                <button
                  (click)="deleteCategory(category)"
                  class="text-red-500 hover:text-red-700"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </li>
              }
            </ul>
            <div class="flex space-x-2">
              <input
                type="text"
                [(ngModel)]="newCategory"
                placeholder="New category name"
                class="flex-grow w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <button
                (click)="addCategory()"
                [disabled]="!newCategory()"
                class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
              >
                Add
              </button>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">
              Financial Reporting
            </h3>
            <button
              (click)="exportFinancialsAsCSV()"
              class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <i class="fas fa-file-csv mr-2"></i>
              <span>Export Financials (CSV)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private dataService = inject(DataService);
  private i18n = inject(I18nService);
  private notificationService = inject(NotificationService);

  newCategory = signal("");

  allUsers = this.dataService.users;
  allRequests = this.dataService.serviceRequests;
  categories = this.dataService.categories;

  pendingProfessionals = computed(() =>
    this.allUsers().filter(
      (u) => u.role === "professional" && u.status === "Pending"
    )
  );

  stats = computed(() => {
    const requests = this.allRequests();
    const users = this.allUsers();

    const totalRevenue = requests
      .filter((r) => r.payment_status === "Paid" && r.cost)
      .reduce((sum, r) => sum + r.cost!, 0);

    return [
      {
        label: this.i18n.translate("totalRevenue"),
        value:
          this.i18n.language() === "pt"
            ? `R$${totalRevenue.toFixed(2)}`
            : `$${totalRevenue.toFixed(2)}`,
        icon: "fas fa-dollar-sign",
      },
      {
        label: this.i18n.translate("pendingApprovals"),
        value: this.pendingProfessionals().length,
        icon: "fas fa-user-clock",
      },
      {
        label: this.i18n.translate("activeServices"),
        value: requests.filter((r) => r.status === "In Progress").length,
        icon: "fas fa-cogs",
      },
      {
        label: this.i18n.translate("totalProfessionals"),
        value: users.filter(
          (u) => u.role === "professional" && u.status === "Active"
        ).length,
        icon: "fas fa-users-cog",
      },
    ];
  });

  handleApproval(user: User, isApproved: boolean) {
    if (!isApproved) {
      if (!confirm(this.i18n.translate("confirmRejectRegistration"))) {
        return;
      }
    }
    const newStatus = isApproved ? "Active" : "Rejected";
    this.dataService.updateUser(user.id, { status: newStatus });

    // Add specific notification for professional approval/rejection
    const actionKey = isApproved
      ? "professionalApproved"
      : "professionalRejected";
    this.notificationService.addNotification(
      this.i18n.translate(actionKey, { name: user.name })
    );
  }

  addCategory() {
    const cat = this.newCategory().trim();
    if (cat && !this.categories().includes(cat)) {
      this.categories.update((cats) => [...cats, cat]);
      this.newCategory.set("");
      // In a real app, this would be a service call to persist the change.
      this.notificationService.addNotification(`Category "${cat}" added.`);
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
      this.categories.update((cats) =>
        cats.filter((c) => c !== categoryToDelete)
      );
      // In a real app, this would be a service call to persist the change.
      this.notificationService.addNotification(
        `Category "${categoryToDelete}" deleted.`
      );
    }
  }

  exportFinancialsAsCSV() {
    const completedRequests = this.allRequests().filter(
      (r) => r.status === "Completed" && r.cost
    );
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
      const client =
        this.allUsers().find((u) => u.id === r.client_id)?.name ||
        i18n.translate("unknownClient");
      const professional =
        this.allUsers().find((u) => u.id === r.professional_id)?.name ||
        i18n.translate("unassigned");
      const tax = r.cost! * 0.07;
      const total = r.cost! + tax;

      return [
        r.id,
        client,
        professional,
        r.title,
        r.scheduled_date,
        r.payment_status,
        r.cost!.toFixed(2),
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
}
