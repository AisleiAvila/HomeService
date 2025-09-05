import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DataService } from '../../services/data.service';
import { ServiceRequest, User, ServiceCategory, Address } from '../../models/maintenance.models';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';

type AdminTab = 'quotes' | 'assignment' | 'financials' | 'categories';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  template: `
    <div class="space-y-8">
      <h1 class="text-3xl font-bold text-gray-800">Admin Dashboard</h1>

      <!-- Tabs Navigation -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
           <button (click)="setTab('quotes')" [class.border-indigo-500]="activeTab() === 'quotes'" [class.text-indigo-600]="activeTab() === 'quotes'" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Pending Quotes
          </button>
          <button (click)="setTab('assignment')" [class.border-indigo-500]="activeTab() === 'assignment'" [class.text-indigo-600]="activeTab() === 'assignment'" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Pending Assignment
          </button>
          <button (click)="setTab('financials')" [class.border-indigo-500]="activeTab() === 'financials'" [class.text-indigo-600]="activeTab() === 'financials'" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Financials
          </button>
          <button (click)="setTab('categories')" [class.border-indigo-500]="activeTab() === 'categories'" [class.text-indigo-600]="activeTab() === 'categories'" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Manage Categories
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      @switch (activeTab()) {
        @case ('quotes') {
          <div class="bg-white p-6 rounded-lg shadow">
             <h2 class="text-xl font-semibold text-gray-800 mb-4">Requests Awaiting Quote</h2>
             <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    @for (request of pendingQuoteRequests(); track request.id) {
                        <tr>
                            <td class="px-6 py-4">
                                <div class="text-sm font-medium text-gray-900">{{ request.title }}</div>
                                <div class="text-sm text-gray-500">{{ request.category }}</div>
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-500">{{ getClientName(request.clientId) }}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatAddress(request.address) }}</td>
                            <td class="px-6 py-4 text-sm font-medium">
                                <button (click)="openQuoteModal(request)" class="text-indigo-600 hover:text-indigo-900">Create Quote</button>
                            </td>
                        </tr>
                    } @empty {
                        <tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No requests awaiting a quote.</td></tr>
                    }
                </tbody>
             </table>
          </div>
        }
        @case ('assignment') {
          <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Approved Requests for Assignment</h2>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                  <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assign Pro</th>
                  </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                  @for (assignReq of pendingAssignmentRequests(); track assignReq.id) {
                      <tr>
                          <td class="px-6 py-4">
                              <div class="text-sm font-medium text-gray-900">{{ assignReq.title }}</div>
                              <div class="text-sm text-gray-500">{{ formatCost(assignReq.cost) }}</div>
                          </td>
                          <td class="px-6 py-4 text-sm text-gray-500">{{ getClientName(assignReq.clientId) }}</td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatAddress(assignReq.address) }}</td>
                          <td class="px-6 py-4 text-sm font-medium">
                              <select #assignSelect (change)="assignProfessional(assignReq.id, assignSelect.value)" class="py-1 px-2 border border-gray-300 rounded-md">
                                  <option value="" disabled selected>Select...</option>
                                  @for (prof of getProfessionalsForRequest(assignReq.category); track prof.id) {
                                      <option [value]="prof.id">{{ prof.name }}</option>
                                  }
                              </select>
                          </td>
                      </tr>
                  } @empty {
                      <tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No requests approved for assignment.</td></tr>
                  }
              </tbody>
            </table>
          </div>
        }
        @case ('financials') {
            <div class="space-y-6">
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-white p-6 rounded-lg shadow flex items-center space-x-4">
                     <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-green-100">
                       <i class="fas fa-check-double text-2xl text-green-500"></i>
                    </div>
                    <div>
                      <h3 class="text-gray-500 text-sm font-medium">Completed Services</h3>
                      <p class="text-2xl font-bold text-gray-800 mt-1">{{ financialStats().completedCount }}</p>
                    </div>
                  </div>
                  <div class="bg-white p-6 rounded-lg shadow flex items-center space-x-4">
                     <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-emerald-100">
                       <i class="fas fa-dollar-sign text-2xl text-emerald-500"></i>
                    </div>
                    <div>
                      <h3 class="text-gray-500 text-sm font-medium">Total Revenue</h3>
                      <p class="text-2xl font-bold text-gray-800 mt-1">{{ formatCost(financialStats().totalRevenue) }}</p>
                    </div>
                  </div>
                  <div class="bg-white p-6 rounded-lg shadow flex items-center space-x-4">
                     <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-yellow-100">
                       <i class="fas fa-file-invoice-dollar text-2xl text-yellow-500"></i>
                    </div>
                    <div>
                      <h3 class="text-gray-500 text-sm font-medium">Outstanding Amount</h3>
                      <p class="text-2xl font-bold text-gray-800 mt-1">{{ formatCost(financialStats().outstandingAmount) }}</p>
                    </div>
                  </div>
                </div>

                <!-- Financials Table -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h2 class="text-xl font-semibold text-gray-800 mb-4">Financial Details</h2>
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            @for (request of financialRequests(); track request.id) {
                                <tr>
                                    <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ request.title }}</td>
                                    <td class="px-6 py-4 text-sm text-gray-500">{{ formatCost(request.cost) }}</td>
                                    <td class="px-6 py-4 text-sm">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                              [class.bg-green-100]="request.paymentStatus === 'Paid'"
                                              [class.text-green-800]="request.paymentStatus === 'Paid'"
                                              [class.bg-yellow-100]="request.paymentStatus !== 'Paid'"
                                              [class.text-yellow-800]="request.paymentStatus !== 'Paid'">
                                            {{ request.paymentStatus }}
                                        </span>
                                    </td>
                                </tr>
                            } @empty {
                                <tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">No completed services yet.</td></tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }
        @case ('categories') {
          <div class="bg-white p-6 rounded-lg shadow">
             <h2 class="text-xl font-semibold text-gray-800 mb-4">Manage Service Categories</h2>
            <!-- Category Management UI from previous step -->
          </div>
        }
      }
    </div>

    <!-- Quote Modal -->
    @if (quotingRequest(); as quoteReq) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full" (click)="$event.stopPropagation()">
                <h3 class="text-2xl font-bold mb-4">Create Quote for "{{ quoteReq.title }}"</h3>
                <form #quoteForm="ngForm" (ngSubmit)="submitQuote()">
                    <div class="space-y-4">
                        <div>
                            <label for="cost" class="block text-sm font-medium text-gray-700">Service Cost ($)</label>
                            <input type="number" id="cost" name="cost" [(ngModel)]="quoteCost" required min="0" step="0.01"
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                        </div>
                    </div>
                    <div class="mt-8 flex justify-end space-x-3">
                        <button type="button" (click)="closeQuoteModal()" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md">Cancel</button>
                        <button type="submit" [disabled]="quoteForm.invalid" class="px-6 py-2 bg-indigo-600 text-white rounded-md">Submit Quote</button>
                    </div>
                </form>
            </div>
        </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  dataService = inject(DataService);
  notificationService = inject(NotificationService);

  activeTab = signal<AdminTab>('quotes');
  quotingRequest = signal<ServiceRequest | null>(null);
  quoteCost = signal<number | null>(null);

  allRequests = this.dataService.serviceRequests;
  allUsers = this.dataService.users;
  categories = this.dataService.categories;
  
  pendingQuoteRequests = computed(() => this.allRequests().filter(r => r.status === 'Pending'));
  pendingAssignmentRequests = computed(() => this.allRequests().filter(r => r.status === 'Approved'));
  financialRequests = computed(() => this.allRequests().filter(r => r.status === 'Completed'));

  financialStats = computed(() => {
    const completed = this.financialRequests();
    const totalRevenue = completed
        .filter(r => r.paymentStatus === 'Paid' && r.cost)
        .reduce((sum, r) => sum + r.cost!, 0);
    const outstandingAmount = completed
        .filter(r => r.paymentStatus === 'Unpaid' && r.cost)
        .reduce((sum, r) => sum + r.cost!, 0);
    
    return {
        completedCount: completed.length,
        totalRevenue: totalRevenue,
        outstandingAmount: outstandingAmount
    };
  });

  setTab(tab: AdminTab) { this.activeTab.set(tab); }
  getClientName(clientId: number): string { return this.allUsers().find(u => u.id === clientId)?.name || 'N/A'; }
  getProfessionalsForRequest(category: ServiceCategory): User[] { return this.dataService.getProfessionalsByCategory(category); }

  formatAddress(address: Address): string {
    return address.street + ', ' + address.city + ', ' + address.state;
  }

  formatCost(cost: number | null): string {
      if (cost) {
        return '$' + cost.toFixed(2);
      }
      return 'N/A';
  }

  assignProfessional(requestId: number, professionalId: string) {
    if (professionalId) {
        const profId = parseInt(professionalId, 10);
        this.dataService.updateServiceRequest(requestId, {
            professionalId: profId,
            status: 'Assigned',
            // Schedule 2 days from now
            scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) 
        });
        // The notification logic is now handled by the dataService.
        this.notificationService.addNotification(`Admin: Assignment successful for request #${requestId}.`);
    }
  }
  
  openQuoteModal(request: ServiceRequest) {
    this.quotingRequest.set(request);
    this.quoteCost.set(null);
  }

  closeQuoteModal() {
    this.quotingRequest.set(null);
  }

  submitQuote() {
    const request = this.quotingRequest();
    if (request && this.quoteCost() !== null && this.quoteCost()! >= 0) {
      this.dataService.submitQuote(request.id, this.quoteCost()!);
      this.closeQuoteModal();
    }
  }
}