import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { User, ServiceRequest, ServiceCategory, ServiceStatus } from '../../models/maintenance.models';

type AdminView = 'overview' | 'requests' | 'professionals' | 'categories' | 'finances';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
        <!-- Header & Navigation -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <h1 class="text-3xl font-bold text-gray-800">Painel do Administrador</h1>
            <div class="mt-4 sm:mt-0 flex space-x-1 bg-gray-200 p-1 rounded-lg">
                @for (view of views; track view.id) {
                    <button 
                        (click)="setView(view.id)"
                        class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                        [class.bg-white]="currentView() === view.id"
                        [class.text-gray-800]="currentView() === view.id"
                        [class.text-gray-500]="currentView() !== view.id"
                        [class.hover:bg-white]="currentView() !== view.id">
                        <i [class]="view.icon" class="mr-2"></i>
                        {{ view.label }}
                    </button>
                }
            </div>
        </div>

        <!-- Content Area -->
        @switch (currentView()) {
            @case ('overview') {
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    @for (stat of stats(); track stat.label) {
                        <div class="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
                            <div class="w-12 h-12 flex items-center justify-center rounded-full" [class]="stat.bgColor">
                                <i class="text-2xl" [class]="stat.icon"></i>
                            </div>
                            <div>
                                <h3 class="text-gray-500 text-sm font-medium">{{ stat.label }}</h3>
                                <p class="text-3xl font-bold text-gray-800 mt-1">{{ stat.value }}</p>
                            </div>
                        </div>
                    }
                </div>
            }
            @case ('requests') {
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-xl font-semibold mb-4">Ações Pendentes</h2>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitação</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                @if (actionableRequests().length === 0) {
                                    <tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Nenhuma solicitação precisa de atenção.</td></tr>
                                } @else {
                                    @for (request of actionableRequests(); track request.id) {
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm font-medium text-gray-900">{{ request.title }}</div>
                                                <div class="text-sm text-gray-500">{{ request.category }}</div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ getClientName(request.clientId) }}</td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <span [class]="statusClass(request.status)">{{ request.status }}</span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                @if (request.status === 'Pending' || request.status === 'Quoted') {
                                                    <button (click)="selectRequestForQuote(request)" class="text-indigo-600 hover:text-indigo-900">
                                                      {{ request.status === 'Quoted' ? 'Ver Cotação' : 'Fornecer Cotação' }}
                                                    </button>
                                                }
                                                @if (request.status === 'Approved') {
                                                    <button (click)="selectRequestForAssignment(request)" class="text-green-600 hover:text-green-900">Atribuir</button>
                                                }
                                            </td>
                                        </tr>
                                    }
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            }
             @case ('professionals') {
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <div class="flex justify-between items-center mb-4">
                      <h2 class="text-xl font-semibold">Gerenciar Profissionais</h2>
                       <button (click)="showAddProfessionalForm.set(true)" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
                          <i class="fas fa-plus mr-2"></i>Adicionar Profissional
                       </button>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profissional</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidades</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                @for (pro of professionals(); track pro.id) {
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="flex items-center">
                                                <div class="flex-shrink-0 h-10 w-10">
                                                    <img class="h-10 w-10 rounded-full" [src]="pro.avatarUrl" alt="">
                                                </div>
                                                <div class="ml-4">
                                                    <div class="text-sm font-medium text-gray-900">{{ pro.name }}</div>
                                                    <div class="text-sm text-gray-500">{{ pro.email }}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="flex flex-wrap gap-1">
                                                @if(pro.specialties) {
                                                    @for (spec of pro.specialties; track spec) {
                                                        <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">{{ spec }}</span>
                                                    }
                                                }
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button (click)="startEditProfessional(pro)" class="text-indigo-600 hover:text-indigo-900">Editar</button>
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            }
            @case ('categories') {
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-xl font-semibold mb-4">Gerenciar Categorias de Serviço</h2>
                    <div class="flex gap-2 mb-4">
                        <input [(ngModel)]="newCategory" placeholder="Nome da nova categoria" class="flex-grow p-2 border rounded-md">
                        <button (click)="addCategory()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Adicionar</button>
                    </div>
                    <ul class="space-y-2">
                        @for (cat of allCategories(); track cat) {
                            <li class="p-3 border rounded-md flex justify-between items-center hover:bg-gray-50">
                                @if (editingCategory() === cat) {
                                    <input [(ngModel)]="editingCategoryName" class="p-1 border rounded-md flex-grow">
                                    <div class="flex space-x-2 ml-2">
                                        <button (click)="saveCategoryEdit()" class="text-green-600 hover:text-green-800"><i class="fas fa-check"></i></button>
                                        <button (click)="editingCategory.set(null)" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times"></i></button>
                                    </div>
                                } @else {
                                    <span>{{ cat }}</span>
                                    <div class="flex space-x-3">
                                        <button (click)="startEditCategory(cat)" class="text-gray-500 hover:text-blue-600"><i class="fas fa-pencil-alt"></i></button>
                                        <button (click)="deleteCategory(cat)" class="text-gray-500 hover:text-red-600"><i class="fas fa-trash"></i></button>
                                    </div>
                                }
                            </li>
                        }
                    </ul>
                </div>
            }
            @case('finances') {
              <div class="space-y-6">
                 <!-- Financial Stats -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-gray-500 text-sm font-medium">Serviços Concluídos</h3><p class="text-3xl font-bold text-gray-800 mt-1">{{ financialStats().completedServices }}</p></div>
                  <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-gray-500 text-sm font-medium">Receita Total (c/ imposto)</h3><p class="text-3xl font-bold text-gray-800 mt-1">{{ formatCost(financialStats().totalRevenue) }}</p></div>
                  <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-gray-500 text-sm font-medium">Valor Pendente (c/ imposto)</h3><p class="text-3xl font-bold text-gray-800 mt-1">{{ formatCost(financialStats().outstandingAmount) }}</p></div>
                  <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-gray-500 text-sm font-medium">Total de Impostos</h3><p class="text-3xl font-bold text-gray-800 mt-1">{{ formatCost(financialStats().totalTax) }}</p></div>
                </div>
                <!-- Financial Details Table -->
                <div class="bg-white p-6 rounded-lg shadow-md">
                   <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-semibold">Detalhes Financeiros</h2>
                        <button (click)="exportToCSV()" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium">
                            <i class="fas fa-file-csv mr-2"></i>Exportar para CSV
                        </button>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serviço</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Base</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Imposto (7%)</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagamento</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                @for (req of completedRequests(); track req.id) {
                                    <tr>
                                        <td class="px-4 py-4"><div class="text-sm font-medium text-gray-900">{{ req.title }}</div><div class="text-sm text-gray-500">{{ getClientName(req.clientId) }}</div></td>
                                        <td class="px-4 py-4 text-sm text-gray-500">{{ formatCost(req.cost) }}</td>
                                        <td class="px-4 py-4 text-sm text-gray-500">{{ formatCost(req.cost ? req.cost * 0.07 : 0) }}</td>
                                        <td class="px-4 py-4 text-sm font-semibold text-gray-900">{{ formatCost(req.cost ? req.cost * 1.07 : 0) }}</td>
                                        <td class="px-4 py-4"><span [class.text-green-600]="req.paymentStatus === 'Paid'" [class.text-red-600]="req.paymentStatus !== 'Paid'">{{ req.paymentStatus === 'Paid' ? 'Pago' : 'Pendente' }}</span></td>
                                        <td class="px-4 py-4"><button (click)="generateInvoice(req)" class="text-indigo-600 hover:text-indigo-900 text-sm">Gerar Fatura</button></td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
              </div>
            }
        }
    </div>

    <!-- Modals -->
    @if (quoteRequest(); as request) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full" (click)="$event.stopPropagation()">
            <h3 class="text-2xl font-bold mb-2">Detalhes da Cotação</h3>
            <p class="text-gray-600 mb-6">Para: <span class="font-semibold">{{ request.title }}</span></p>
            <div class="space-y-3 p-4 bg-gray-50 rounded-md border">
                <p><strong>Cliente:</strong> {{ getClientName(request.clientId) }}</p>
                <p><strong>Descrição:</strong> {{ request.description }}</p>
            </div>

            @if (request.status === 'Pending') {
              <div class="mt-6">
                <label for="quoteAmount" class="block text-sm font-medium text-gray-700">Valor da Cotação (R$)</label>
                <input type="number" id="quoteAmount" [(ngModel)]="quoteAmount" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="ex: 150.00">
              </div>
            } @else {
               <div class="mt-6 text-center bg-blue-50 p-4 rounded-lg">
                <p class="text-sm text-blue-700">Cotação Enviada</p>
                <p class="text-3xl font-bold text-blue-900">{{ formatCost(request.cost) }}</p>
              </div>
            }
             <div class="mt-8 flex justify-end space-x-3">
                <button (click)="quoteRequest.set(null)" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Fechar</button>
                @if (request.status === 'Pending') {
                  <button (click)="submitQuote()" [disabled]="!quoteAmount() || quoteAmount() <= 0" class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300">Enviar Cotação</button>
                }
                 @if (request.status === 'Quoted') {
                  <button (click)="respondToQuote(request.id, false)" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Rejeitar</button>
                  <button (click)="respondToQuote(request.id, true)" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Aprovar</button>
                 }
              </div>
          </div>
        </div>
    }

    @if (assignmentRequest(); as request) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full" (click)="$event.stopPropagation()">
            <h3 class="text-2xl font-bold mb-2">Atribuir Profissional</h3>
            <p class="text-gray-600 mb-6">Para: <span class="font-semibold">{{ request.title }}</span> ({{ request.category }})</p>
            
            <label for="professionalSelect" class="block text-sm font-medium text-gray-700">Selecione um Profissional</label>
            <select id="professionalSelect" [(ngModel)]="assigningProfessionalId" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                <option [ngValue]="null" disabled>-- Escolha um --</option>
                @for (pro of getProfessionalsForRequest(request.category); track pro.id) {
                    <option [value]="pro.id">{{ pro.name }}</option>
                }
            </select>
            @if (getProfessionalsForRequest(request.category).length === 0) {
                <p class="text-sm text-red-600 mt-2">Nenhum profissional encontrado para esta categoria.</p>
            }

             <div class="mt-8 flex justify-end space-x-3">
                <button (click)="assignmentRequest.set(null)" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                <button (click)="assignProfessional()" [disabled]="!assigningProfessionalId()" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300">Atribuir</button>
              </div>
          </div>
        </div>
    }
    
    <!-- Add/Edit Professional Modal -->
    @if(showAddProfessionalForm() || editingProfessional()) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full">
            <h3 class="text-2xl font-bold mb-6">{{ editingProfessional() ? 'Editar Profissional' : 'Adicionar Novo Profissional' }}</h3>
            <div class="space-y-4">
               <input [ngModel]="editingProfessional() ? editingProfessionalName() : newProfessionalName()" (ngModelChange)="editingProfessional() ? editingProfessionalName.set($event) : newProfessionalName.set($event)" placeholder="Nome Completo" class="w-full p-2 border rounded-md">
               <input [ngModel]="editingProfessional() ? editingProfessionalEmail() : newProfessionalEmail()" (ngModelChange)="editingProfessional() ? editingProfessionalEmail.set($event) : newProfessionalEmail.set($event)" placeholder="Endereço de E-mail" type="email" class="w-full p-2 border rounded-md">
            </div>
            <div class="mt-4">
              <h4 class="font-medium mb-2">Especialidades</h4>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                 @for(cat of allCategories(); track cat) {
                  <label class="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                    <input type="checkbox" 
                           [checked]="(editingProfessional() ? editingProfessionalSpecialties() : newProfessionalSpecialties()).includes(cat)" 
                           (change)="editingProfessional() ? toggleEditProfessionalSpecialty(cat, $event) : toggleNewProfessionalSpecialty(cat, $event)">
                    <span>{{ cat }}</span>
                  </label>
                 }
              </div>
            </div>
            <div class="mt-8 flex justify-end space-x-2">
                <button (click)="editingProfessional() ? cancelEditProfessional() : resetNewProfessionalForm()" class="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                <button (click)="editingProfessional() ? saveProfessionalEdit() : addProfessional()" class="px-4 py-2 bg-green-600 text-white rounded-md">Salvar</button>
            </div>
        </div>
      </div>
    }

    <!-- Invoice Modal -->
    @if (invoiceRequest(); as request) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full">
          <div #invoiceContent class="p-8 invoice-content">
              <h2 class="text-2xl font-bold text-gray-800">Fatura</h2>
              <p class="text-gray-500">Para o serviço: {{ request.title }}</p>
              <div class="grid grid-cols-2 gap-8 mt-8">
                  <div><h3 class="font-semibold">Cliente:</h3><p>{{ getClientName(request.clientId) }}</p></div>
                  <div><h3 class="font-semibold">Profissional:</h3><p>{{ getProfessionalName(request.professionalId) }}</p></div>
              </div>
              <table class="w-full mt-8 text-left">
                  <thead><tr class="bg-gray-100"><th class="p-2">Descrição</th><th class="p-2 text-right">Valor</th></tr></thead>
                  <tbody>
                      <tr><td class="p-2 border-b">Valor Base</td><td class="p-2 border-b text-right">{{ formatCost(request.cost) }}</td></tr>
                      <tr><td class="p-2 border-b">Imposto (7%)</td><td class="p-2 border-b text-right">{{ formatCost(request.cost ? request.cost * 0.07 : 0) }}</td></tr>
                      <tr class="font-bold"><td class="p-2">Total</td><td class="p-2 text-right">{{ formatCost(request.cost ? request.cost * 1.07 : 0) }}</td></tr>
                  </tbody>
              </table>
          </div>
           <div class="p-4 bg-gray-50 flex justify-end space-x-2 no-print">
              <button (click)="invoiceRequest.set(null)" class="px-4 py-2 bg-gray-200 rounded-md">Fechar</button>
              <button (click)="printInvoice()" class="px-4 py-2 bg-blue-600 text-white rounded-md">Imprimir</button>
           </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);

  currentView = signal<AdminView>('overview');
  readonly views: { id: AdminView; label: string; icon: string }[] = [
    { id: 'overview', label: 'Visão Geral', icon: 'fas fa-chart-pie' },
    { id: 'requests', label: 'Solicitações', icon: 'fas fa-tasks' },
    { id: 'finances', label: 'Finanças', icon: 'fas fa-file-invoice-dollar' },
    { id: 'professionals', label: 'Profissionais', icon: 'fas fa-users-cog' },
    { id: 'categories', label: 'Categorias', icon: 'fas fa-tags' },
  ];

  allRequests = this.dataService.serviceRequests;
  allUsers = this.dataService.users;
  allCategories = this.dataService.categories;

  professionals = computed(() => this.allUsers().filter(u => u.role === 'professional'));
  
  actionableRequests = computed(() => this.allRequests().filter(r => ['Pending', 'Quoted', 'Approved'].includes(r.status)).sort((a,b) => a.requestedDate.getTime() - b.requestedDate.getTime()));

  stats = computed(() => {
    const requests = this.allRequests();
    const totalEarnings = requests
      .filter(r => r.paymentStatus === 'Paid' && r.cost)
      .reduce((sum, r) => sum + r.cost! * 1.07, 0); // With tax

    return [
      { label: 'Receita Total', value: this.formatCost(totalEarnings), icon: 'fas fa-dollar-sign text-green-500', bgColor: 'bg-green-100' },
      { label: 'Ações Pendentes', value: this.actionableRequests().length, icon: 'fas fa-exclamation-circle text-yellow-500', bgColor: 'bg-yellow-100' },
      { label: 'Serviços Ativos', value: requests.filter(r => r.status === 'In Progress').length, icon: 'fas fa-running text-blue-500', bgColor: 'bg-blue-100' },
      { label: 'Total de Profissionais', value: this.professionals().length, icon: 'fas fa-users text-purple-500', bgColor: 'bg-purple-100' }
    ];
  });
  
  // State for modals
  quoteRequest = signal<ServiceRequest | null>(null);
  quoteAmount = signal<number | null>(null);
  assignmentRequest = signal<ServiceRequest | null>(null);
  assigningProfessionalId = signal<number | null>(null);
  invoiceRequest = signal<ServiceRequest | null>(null);

  // State for category management
  newCategory = signal('');
  editingCategory = signal<ServiceCategory | null>(null);
  editingCategoryName = signal('');
  
  // State for professional management
  showAddProfessionalForm = signal(false);
  newProfessionalName = signal('');
  newProfessionalEmail = signal('');
  newProfessionalSpecialties = signal<ServiceCategory[]>([]);
  editingProfessional = signal<User | null>(null);
  editingProfessionalName = signal('');
  editingProfessionalEmail = signal('');
  editingProfessionalSpecialties = signal<ServiceCategory[]>([]);


  setView(view: AdminView) {
    this.currentView.set(view);
  }

  getClientName(clientId: number): string {
    return this.allUsers().find(u => u.id === clientId)?.name ?? 'Cliente Desconhecido';
  }

  getProfessionalName(proId: number | null): string {
    if (proId === null) return 'Não atribuído';
    return this.allUsers().find(u => u.id === proId)?.name ?? 'Não atribuído';
  }

  getProfessionalsForRequest(category: ServiceCategory): User[] {
    return this.dataService.getProfessionalsByCategory(category);
  }

  // --- Quote & Request Logic ---
  selectRequestForQuote(request: ServiceRequest) {
    this.quoteAmount.set(request.cost);
    this.quoteRequest.set(request);
  }

  submitQuote() {
    const request = this.quoteRequest();
    const amount = this.quoteAmount();
    if (request && amount && amount > 0) {
      this.dataService.submitQuote(request.id, amount);
      this.quoteRequest.set(null);
    }
  }
  
  respondToQuote(requestId: number, approved: boolean) {
      this.dataService.respondToQuote(requestId, approved);
      this.quoteRequest.set(null);
  }

  // --- Assignment Logic ---
  selectRequestForAssignment(request: ServiceRequest) {
      this.assigningProfessionalId.set(null);
      this.assignmentRequest.set(request);
  }
  
  assignProfessional() {
      const request = this.assignmentRequest();
      const proId = this.assigningProfessionalId();
      if (request && proId) {
          this.dataService.assignProfessional(request.id, proId);
          this.assignmentRequest.set(null);
      }
  }
  
  // --- Category Management ---
  addCategory() {
      const name = this.newCategory().trim();
      if (name) {
          this.dataService.addCategory(name);
          this.newCategory.set('');
      }
  }

  startEditCategory(category: ServiceCategory) {
      this.editingCategoryName.set(category);
      this.editingCategory.set(category);
  }

  saveCategoryEdit() {
      const oldName = this.editingCategory();
      const newName = this.editingCategoryName().trim();
      if (oldName && newName) {
          this.dataService.updateCategory(oldName, newName);
          this.editingCategory.set(null);
      }
  }

  deleteCategory(category: ServiceCategory) {
      if (confirm(`Tem certeza de que deseja excluir a categoria "${category}"? Esta ação não pode ser desfeita.`)) {
          this.dataService.deleteCategory(category);
      }
  }
  
  // --- Professional Management ---
  toggleNewProfessionalSpecialty(category: ServiceCategory, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.newProfessionalSpecialties.update(current => isChecked ? [...current, category] : current.filter(c => c !== category));
  }

  resetNewProfessionalForm() {
    this.newProfessionalName.set('');
    this.newProfessionalEmail.set('');
    this.newProfessionalSpecialties.set([]);
    this.showAddProfessionalForm.set(false);
  }

  addProfessional() {
    this.dataService.addProfessional(this.newProfessionalName(), this.newProfessionalEmail(), this.newProfessionalSpecialties());
    this.resetNewProfessionalForm();
  }

  startEditProfessional(pro: User) {
    this.editingProfessionalName.set(pro.name);
    this.editingProfessionalEmail.set(pro.email);
    this.editingProfessionalSpecialties.set([...(pro.specialties || [])]);
    this.editingProfessional.set(pro);
  }

  cancelEditProfessional() {
    this.editingProfessional.set(null);
  }

  saveProfessionalEdit() {
    const pro = this.editingProfessional();
    if (!pro) return;
    this.dataService.updateUser(pro.id, {
      name: this.editingProfessionalName(),
      email: this.editingProfessionalEmail(),
      specialties: this.editingProfessionalSpecialties()
    });
    this.editingProfessional.set(null);
  }

  toggleEditProfessionalSpecialty(category: ServiceCategory, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.editingProfessionalSpecialties.update(current => isChecked ? [...current, category] : current.filter(c => c !== category));
  }

  // --- Finances ---
  completedRequests = computed(() => this.allRequests().filter(r => r.status === 'Completed'));

  financialStats = computed(() => {
    const completed = this.completedRequests();
    const taxRate = 0.07;
    const totalRevenueWithTax = completed.filter(r => r.paymentStatus === 'Paid' && r.cost).reduce((sum, r) => sum + r.cost! * (1 + taxRate), 0);
    const outstandingAmountWithTax = completed.filter(r => r.paymentStatus === 'Unpaid' && r.cost).reduce((sum, r) => sum + r.cost! * (1 + taxRate), 0);
    const totalTax = completed.filter(r => r.cost).reduce((sum, r) => sum + r.cost! * taxRate, 0);
    return { completedServices: completed.length, totalRevenue: totalRevenueWithTax, outstandingAmount: outstandingAmountWithTax, totalTax };
  });

  formatCost(cost: number | null): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cost ?? 0);
  }

  generateInvoice(request: ServiceRequest) { this.invoiceRequest.set(request); }
  printInvoice() { window.print(); }

  private escapeCsvCell(cell: any): string {
    const cellStr = String(cell ?? '');
    if (/[",\n]/.test(cellStr)) {
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
  }

  exportToCSV() {
    const completed = this.completedRequests();
    if (completed.length === 0) {
      this.notificationService.addNotification("Não há dados financeiros para exportar.");
      return;
    }
    const taxRate = 0.07;
    const headers = ['ID', 'Cliente', 'Profissional', 'Serviço', 'Data Conclusão', 'Status Pag.', 'Valor Base', 'Imposto (7%)', 'Valor Total'];
    const rows = completed.map(req => {
      const baseCost = req.cost ?? 0;
      const tax = baseCost * taxRate;
      const totalCost = baseCost + tax;
      const rowData = [
        req.id,
        this.getClientName(req.clientId),
        this.getProfessionalName(req.professionalId),
        req.title,
        req.scheduledDate ? new Date(req.scheduledDate).toLocaleDateString('pt-BR') : 'N/A',
        req.paymentStatus === 'Paid' ? 'Pago' : 'Pendente',
        baseCost.toFixed(2),
        tax.toFixed(2),
        totalCost.toFixed(2)
      ];
      return rowData.map(cell => this.escapeCsvCell(cell)).join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `relatorio_financeiro_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.notificationService.addNotification("Relatório financeiro exportado com sucesso.");
  }
  
  statusClass(status: ServiceStatus): string {
    const colorClasses: Record<ServiceStatus, string> = {
      'Pending': 'bg-yellow-100 text-yellow-800', 'Quoted': 'bg-cyan-100 text-cyan-800',
      'Approved': 'bg-indigo-100 text-indigo-800', 'Assigned': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-purple-100 text-purple-800', 'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-gray-100 text-gray-800',
    };
    return `px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[status]}`;
  }
}