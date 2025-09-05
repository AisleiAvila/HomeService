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
          <div class="bg-white p-6 rounded-lg shadow max-w-3xl mx-auto">
             <h2 class="text-xl font-semibold text-gray-800 mb-4">Manage Service Categories</h2>
             
             <!-- Add New Category Form -->
             <div class="mb-6 p-4 border rounded-md bg-gray-50">
                <form #addCategoryForm="ngForm" (ngSubmit)="handleAddCategory()" class="flex items-center space-x-4">
                  <div class="flex-grow">
                      <label for="newCategoryName" class="sr-only">New Category Name</label>
                      <input type="text" id="newCategoryName" name="newCategoryName" 
                             [(ngModel)]="newCategoryName" required
                             placeholder="Enter new category name"
                             class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                  </div>
                  <button type="submit" [disabled]="!addCategoryForm.valid"
                          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">
                      <i class="fas fa-plus mr-2"></i>Add
                  </button>
                </form>
             </div>

             <!-- Existing Categories List -->
             <ul class="divide-y divide-gray-200">
                @for (category of categories(); track category) {
                  <li class="py-3 flex items-center justify-between">
                    @if (editingCategory()?.originalName === category) {
                        <!-- Edit Mode -->
                        <div class="flex-grow flex items-center space-x-2">
                           <input type="text" [(ngModel)]="editingCategory().newName" class="flex-grow px-2 py-1 border border-indigo-300 rounded-md">
                           <button (click)="handleUpdateCategory()" class="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600"><i class="fas fa-check"></i></button>
                           <button (click)="handleCancelEdit()" class="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600"><i class="fas fa-times"></i></button>
                        </div>
                    } @else {
                        <!-- View Mode -->
                        <span class="text-gray-700">{{ category }}</span>
                        <div class="space-x-3">
                            <button (click)="handleEditCategory(category)" class="text-sm text-blue-600 hover:text-blue-800"><i class="fas fa-pencil-alt mr-1"></i>Edit</button>
                            <button (click)="handleDeleteCategory(category)" class="text-sm text-red-600 hover:text-red-800"><i class="fas fa-trash-alt mr-1"></i>Delete</button>
                        </div>
                    }
                  </li>
                } @empty {
                   <li class="py-4 text-center text-gray-500">No categories found.</li>
                }
             </ul>
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

    <!-- Delete Category Confirmation Modal -->
    @if (categoryToDelete(); as category) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full" (click)="$event.stopPropagation()">
          <h3 class="text-2xl font-bold mb-4 text-red-700">Confirm Deletion</h3>
          <p class="text-gray-600">Are you sure you want to delete the category <strong class="font-semibold">"{{ category }}"</strong>? This action cannot be undone.</p>
          <div class="mt-8 flex justify-end space-x-3">
            <button (click)="cancelDelete()" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
            <button (click)="confirmDelete()" class="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
          </div>
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

  // Signals for Category Management
  newCategoryName = signal('');
  editingCategory = signal<{ originalName: ServiceCategory; newName: string } | null>(null);
  categoryToDelete = signal<ServiceCategory | null>(null);


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

  // Category Management Methods
  handleAddCategory() {
    this.dataService.addCategory(this.newCategoryName());
    this.newCategoryName.set('');
  }

  handleEditCategory(category: ServiceCategory) {
    this.editingCategory.set({ originalName: category, newName: category });
  }

  handleCancelEdit() {
    this.editingCategory.set(null);
  }

  handleUpdateCategory() {
    const edit = this.editingCategory();
    if (edit) {
      this.dataService.updateCategory(edit.originalName, edit.newName);
      this.editingCategory.set(null);
    }
  }

  handleDeleteCategory(category: ServiceCategory) {
    this.categoryToDelete.set(category);
  }

  confirmDelete() {
    const category = this.categoryToDelete();
    if (category) {
      this.dataService.deleteCategory(category);
    }
    this.categoryToDelete.set(null);
  }

  cancelDelete() {
    this.categoryToDelete.set(null);
  }
}