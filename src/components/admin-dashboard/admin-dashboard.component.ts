import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { ServiceRequest, User, ServiceCategory, Address } from '../../models/maintenance.models';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';

type AdminTab = 'quotes' | 'assignment' | 'financials' | 'categories' | 'users';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8">
      <h1 class="text-3xl font-bold text-gray-800">Admin Dashboard</h1>

      <!-- Tabs Navigation -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
           <button (click)="setTab('quotes')" [class.border-indigo-500]="activeTab() === 'quotes'" [class.text-indigo-600]="activeTab() === 'quotes'" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Cotações
          </button>
          <button (click)="setTab('assignment')" [class.border-indigo-500]="activeTab() === 'assignment'" [class.text-indigo-600]="activeTab() === 'assignment'" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Atribuição Pendente
          </button>
          <button (click)="setTab('financials')" [class.border-indigo-500]="activeTab() === 'financials'" [class.text-indigo-600]="activeTab() === 'financials'" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Finanças
          </button>
          <button (click)="setTab('categories')" [class.border-indigo-500]="activeTab() === 'categories'" [class.text-indigo-600]="activeTab() === 'categories'" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Gerenciar Categorias
          </button>
          <button (click)="setTab('users')" [class.border-indigo-500]="activeTab() === 'users'" [class.text-indigo-600]="activeTab() === 'users'" class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Gerenciar Usuários
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      @switch (activeTab()) {
        @case ('quotes') {
          <div class="bg-white p-6 rounded-lg shadow">
             <h2 class="text-xl font-semibold text-gray-800 mb-4">Gerenciar Cotações</h2>
             <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serviço</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ação</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    @for (request of quoteRequests(); track request.id) {
                        <tr>
                            <td class="px-6 py-4">
                                <div class="text-sm font-medium text-gray-900">{{ request.title }}</div>
                                <div class="text-sm text-gray-500">{{ request.category }}</div>
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-500">{{ getClientName(request.clientId) }}</td>
                            <td class="px-6 py-4 text-sm text-gray-500">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                      [class.bg-yellow-100]="request.status === 'Pending'"
                                      [class.text-yellow-800]="request.status === 'Pending'"
                                      [class.bg-cyan-100]="request.status === 'Quoted'"
                                      [class.text-cyan-800]="request.status === 'Quoted'">
                                    {{ request.status }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-sm font-medium">
                                @if (request.status === 'Pending') {
                                    <button (click)="openQuoteModal(request)" class="text-indigo-600 hover:text-indigo-900">Criar Cotação</button>
                                }
                                @if (request.status === 'Quoted') {
                                    <button (click)="openQuoteDetailsModal(request)" class="text-indigo-600 hover:text-indigo-900">Ver Cotação</button>
                                }
                            </td>
                        </tr>
                    } @empty {
                        <tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Nenhuma cotação pendente.</td></tr>
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
                              <select #assignSelect (change)="assignProfessional(assignReq, assignSelect.value)" class="py-1 px-2 border border-gray-300 rounded-md">
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
                      <h3 class="text-gray-500 text-sm font-medium">Serviços Concluídos</h3>
                      <p class="text-2xl font-bold text-gray-800 mt-1">{{ financialStats().completedCount }}</p>
                    </div>
                  </div>
                  <div class="bg-white p-6 rounded-lg shadow flex items-center space-x-4">
                     <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-emerald-100">
                       <i class="fas fa-dollar-sign text-2xl text-emerald-500"></i>
                    </div>
                    <div>
                      <h3 class="text-gray-500 text-sm font-medium">Receita Total</h3>
                      <p class="text-2xl font-bold text-gray-800 mt-1">{{ formatCost(financialStats().totalRevenue) }}</p>
                    </div>
                  </div>
                  <div class="bg-white p-6 rounded-lg shadow flex items-center space-x-4">
                     <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-yellow-100">
                       <i class="fas fa-file-invoice-dollar text-2xl text-yellow-500"></i>
                    </div>
                    <div>
                      <h3 class="text-gray-500 text-sm font-medium">Valor Pendente</h3>
                      <p class="text-2xl font-bold text-gray-800 mt-1">{{ formatCost(financialStats().outstandingAmount) }}</p>
                    </div>
                  </div>
                </div>

                <!-- Financials Table -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h2 class="text-xl font-semibold text-gray-800 mb-4">Detalhes Financeiros</h2>
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serviço</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profissional</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data de Conclusão</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status do Pagamento</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            @for (request of financialRequests(); track request.id) {
                                <tr>
                                    <td class="px-6 py-4 text-sm font-mono text-gray-500">#{{ request.id }}</td>
                                    <td class="px-6 py-4">
                                      <div class="text-sm font-medium text-gray-900">{{ request.title }}</div>
                                      <div class="text-sm text-gray-500">{{ request.category }}</div>
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-500">{{ getClientName(request.clientId) }}</td>
                                    <td class="px-6 py-4 text-sm text-gray-500">{{ getProfessionalName(request.professionalId) }}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ request.scheduledDate | date:'mediumDate' }}</td>
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
                                <tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Nenhum serviço concluído ainda.</td></tr>
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
        @case ('users') {
          <div class="bg-white p-6 rounded-lg shadow">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold text-gray-800">Gerenciar Profissionais</h2>
              <button (click)="openAddProfessionalModal()" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                <i class="fas fa-plus mr-2"></i>Adicionar Profissional
              </button>
            </div>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                  <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Especialidade</th>
                  </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                  @for (pro of professionals(); track pro.id) {
                      <tr>
                          <td class="px-6 py-4 flex items-center">
                            <img [src]="pro.avatarUrl" [alt]="pro.name" class="h-10 w-10 rounded-full mr-4">
                            <div class="text-sm font-medium text-gray-900">{{ pro.name }}</div>
                          </td>
                          <td class="px-6 py-4 text-sm text-gray-500">{{ pro.email }}</td>
                          <td class="px-6 py-4 text-sm text-gray-500">{{ pro.specialty }}</td>
                      </tr>
                  } @empty {
                      <tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">Nenhum profissional cadastrado.</td></tr>
                  }
              </tbody>
            </table>
          </div>
        }
      }
    </div>

    <!-- Quote Creation Modal -->
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

    <!-- Quote Details Modal -->
    @if (viewingQuote(); as quote) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" (click)="closeQuoteDetailsModal()">
        <div class="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full" (click)="$event.stopPropagation()">
          <h3 class="text-2xl font-bold mb-4">Detalhes da Cotação</h3>
          <div class="space-y-3 text-gray-700 border-t border-b py-4">
            <p><strong class="w-32 inline-block">Título do Serviço:</strong> {{ quote.title }}</p>
            <p><strong class="w-32 inline-block">Descrição:</strong> {{ quote.description }}</p>
            <p><strong class="w-32 inline-block">Cliente:</strong> {{ getClientName(quote.clientId) }}</p>
            <p><strong class="w-32 inline-block">Custo Cotado:</strong> <span class="font-bold text-lg text-green-600">{{ formatCost(quote.cost) }}</span></p>
          </div>
          <div class="mt-6 flex justify-end space-x-3">
            <button (click)="closeQuoteDetailsModal()" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Fechar</button>
            <button (click)="handleQuoteResponse(false)" class="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Rejeitar</button>
            <button (click)="handleQuoteResponse(true)" class="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Aprovar</button>
          </div>
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

    <!-- Add Professional Modal -->
    @if (showAddProfessionalModal()) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full" (click)="$event.stopPropagation()">
          <h3 class="text-2xl font-bold mb-4">Adicionar Novo Profissional</h3>
          <form #addProForm="ngForm" (ngSubmit)="handleAddProfessional()">
            <div class="space-y-4">
              <div>
                <label for="proName" class="block text-sm font-medium text-gray-700">Nome Completo</label>
                <input type="text" id="proName" name="proName" [(ngModel)]="newProfessionalName" required
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
              </div>
              <div>
                <label for="proEmail" class="block text-sm font-medium text-gray-700">E-mail</label>
                <input type="email" id="proEmail" name="proEmail" [(ngModel)]="newProfessionalEmail" required
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
              </div>
              <div>
                <label for="proSpecialty" class="block text-sm font-medium text-gray-700">Especialidade</label>
                <select id="proSpecialty" name="proSpecialty" [(ngModel)]="newProfessionalSpecialty" required
                        class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                    <option [ngValue]="null" disabled>Selecione uma especialidade</option>
                    @for (cat of categories(); track cat) {
                      <option [value]="cat">{{ cat }}</option>
                    }
                </select>
              </div>
            </div>
            <div class="mt-8 flex justify-end space-x-3">
              <button type="button" (click)="closeAddProfessionalModal()" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md">Cancelar</button>
              <button type="submit" [disabled]="addProForm.invalid" class="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">Salvar</button>
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
  viewingQuote = signal<ServiceRequest | null>(null);
  quoteCost = signal<number | null>(null);

  // Signals for Category Management
  newCategoryName = signal('');
  editingCategory = signal<{ originalName: ServiceCategory; newName: string } | null>(null);
  categoryToDelete = signal<ServiceCategory | null>(null);

  // Signals for Add Professional Modal
  showAddProfessionalModal = signal(false);
  newProfessionalName = signal('');
  newProfessionalEmail = signal('');
  newProfessionalSpecialty = signal<ServiceCategory | null>(null);


  allRequests = this.dataService.serviceRequests;
  allUsers = this.dataService.users;
  categories = this.dataService.categories;
  
  quoteRequests = computed(() => this.allRequests().filter(r => r.status === 'Pending' || r.status === 'Quoted'));
  pendingAssignmentRequests = computed(() => this.allRequests().filter(r => r.status === 'Approved'));
  financialRequests = computed(() => this.allRequests().filter(r => r.status === 'Completed'));
  professionals = computed(() => this.allUsers().filter(u => u.role === 'professional'));

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
  getProfessionalName(professionalId: number | null): string {
    if (!professionalId) return 'N/A';
    return this.allUsers().find(u => u.id === professionalId)?.name || 'N/A';
  }
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

  assignProfessional(request: ServiceRequest, professionalId: string) {
    if (professionalId) {
        const profId = parseInt(professionalId, 10);
        this.dataService.assignProfessional(request.id, profId);
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

  openQuoteDetailsModal(request: ServiceRequest) {
    this.viewingQuote.set(request);
  }

  closeQuoteDetailsModal() {
    this.viewingQuote.set(null);
  }

  handleQuoteResponse(approved: boolean) {
    const request = this.viewingQuote();
    if (request) {
      this.dataService.respondToQuote(request.id, approved);
      this.closeQuoteDetailsModal();
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

  // Methods for Add Professional Modal
  openAddProfessionalModal() {
    this.newProfessionalName.set('');
    this.newProfessionalEmail.set('');
    this.newProfessionalSpecialty.set(this.categories().length > 0 ? this.categories()[0] : null);
    this.showAddProfessionalModal.set(true);
  }

  closeAddProfessionalModal() {
    this.showAddProfessionalModal.set(false);
  }

  handleAddProfessional() {
    const name = this.newProfessionalName();
    const email = this.newProfessionalEmail();
    const specialty = this.newProfessionalSpecialty();

    if (!name || !email || !specialty) {
      this.notificationService.addNotification('Por favor, preencha todos os campos.');
      return;
    }
    this.dataService.addProfessional(name, email, specialty);
    this.closeAddProfessionalModal();
  }
}