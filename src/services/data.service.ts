import { Injectable, signal, inject } from '@angular/core';
import { User, ServiceRequest, ChatMessage, ServiceCategory, ServiceStatus } from '../models/maintenance.models';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private notificationService = inject(NotificationService);

  private _users = signal<User[]>([
    { id: 1, name: 'Alice Johnson', email: 'alice@email.com', role: 'client', avatarUrl: 'https://i.pravatar.cc/150?u=1' },
    { id: 2, name: 'Bob Williams', email: 'bob@email.com', role: 'professional', specialty: 'Plumbing', avatarUrl: 'https://i.pravatar.cc/150?u=2' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@email.com', role: 'professional', specialty: 'Electrical', avatarUrl: 'https://i.pravatar.cc/150?u=3' },
    { id: 4, name: 'Diana Prince', email: 'diana@email.com', role: 'admin', avatarUrl: 'https://i.pravatar.cc/150?u=4' },
    { id: 5, name: 'Eve Adams', email: 'eve@email.com', role: 'client', avatarUrl: 'https://i.pravatar.cc/150?u=5' },
    { id: 6, name: 'Frank Wright', email: 'frank@email.com', role: 'professional', specialty: 'Painting', avatarUrl: 'https://i.pravatar.cc/150?u=6' },
  ]);

  private _serviceRequests = signal<ServiceRequest[]>([
    { id: 101, clientId: 1, professionalId: 2, title: 'Leaky Faucet in Kitchen', description: 'The kitchen sink faucet has been dripping constantly for two days.', category: 'Plumbing', requestedDate: new Date('2024-05-20'), scheduledDate: new Date('2024-05-22T10:00:00'), status: 'In Progress', address: { street: '123 Maple St', city: 'Springfield', state: 'IL', zipCode: '62704' }, cost: 150.00, paymentStatus: 'Unpaid' },
    { id: 102, clientId: 1, professionalId: 3, title: 'Install new ceiling fan', description: 'Need a new ceiling fan installed in the living room.', category: 'Electrical', requestedDate: new Date('2024-05-18'), scheduledDate: new Date('2024-05-24T14:00:00'), status: 'Assigned', address: { street: '123 Maple St', city: 'Springfield', state: 'IL', zipCode: '62704' }, cost: 250.00, paymentStatus: 'Unpaid' },
    { id: 103, clientId: 5, professionalId: null, title: 'Paint the bedroom walls', description: 'The master bedroom needs a fresh coat of paint. Color is light blue.', category: 'Painting', requestedDate: new Date('2024-05-21'), scheduledDate: null, status: 'Pending', address: { street: '456 Oak Ave', city: 'Springfield', state: 'IL', zipCode: '62701' }, cost: null, paymentStatus: 'Unpaid' },
    { id: 104, clientId: 5, professionalId: 2, title: 'Clogged drain in bathroom', description: 'The shower drain is completely clogged.', category: 'Plumbing', requestedDate: new Date('2024-04-15'), scheduledDate: new Date('2024-04-18'), status: 'Completed', address: { street: '456 Oak Ave', city: 'Springfield', state: 'IL', zipCode: '62701' }, cost: 95.50, paymentStatus: 'Paid' },
  ]);
  
  private _messages = signal<ChatMessage[]>([
    { id: 1, serviceRequestId: 101, senderId: 1, text: 'Hi Bob, are you on your way?', timestamp: new Date() },
    { id: 2, serviceRequestId: 101, senderId: 2, text: 'Yes, I should be there in about 15 minutes.', timestamp: new Date() }
  ]);

  private _categories = signal<ServiceCategory[]>(['Plumbing', 'Electrical', 'Painting', 'Gardening', 'General Repair']);

  users = this._users.asReadonly();
  serviceRequests = this._serviceRequests.asReadonly();
  messages = this._messages.asReadonly();
  categories = this._categories.asReadonly();

  getUserById(id: number): User | undefined {
    return this.users().find(u => u.id === id);
  }

  getServiceRequestById(id: number): ServiceRequest | undefined {
    return this.serviceRequests().find(s => s.id === id);
  }

  getMessagesForService(serviceRequestId: number): ChatMessage[] {
    return this.messages().filter(m => m.serviceRequestId === serviceRequestId);
  }

  addMessage(serviceRequestId: number, senderId: number, text: string) {
    const newMessage: ChatMessage = {
      id: Math.max(...this.messages().map(m => m.id), 0) + 1,
      serviceRequestId,
      senderId,
      text,
      timestamp: new Date()
    };
    this._messages.update(messages => [...messages, newMessage]);
  }

  addServiceRequest(request: Omit<ServiceRequest, 'id' | 'professionalId' | 'status' | 'scheduledDate' | 'cost' | 'paymentStatus'>) {
    const newRequest: ServiceRequest = {
      ...request,
      id: Math.max(...this.serviceRequests().map(r => r.id), 0) + 1,
      professionalId: null,
      status: 'Pending',
      scheduledDate: null,
      cost: null,
      paymentStatus: 'Unpaid'
    };
    this._serviceRequests.update(requests => [...requests, newRequest]);
    this.notificationService.addNotification(`Admin: New service request "${newRequest.title}" needs a quote.`);
  }

  updateUser(id: number, updates: Partial<Pick<User, 'name' | 'specialty'>>) {
    this._users.update(users => users.map(user => user.id === id ? { ...user, ...updates } : user));
    this.notificationService.addNotification('Profile updated successfully.');
  }

  updateServiceRequest(id: number, updates: Partial<ServiceRequest>) {
    this._serviceRequests.update(requests => 
      requests.map(req => {
        if (req.id === id) {
          const originalStatus = req.status;
          const updatedReq = { ...req, ...updates };
          
          // Notification for when service is completed
          if (updatedReq.status === 'Completed' && originalStatus !== 'Completed') {
              this.notificationService.addNotification(`Service "${updatedReq.title}" is complete. Payment is now due.`);
          }

          return updatedReq;
        }
        return req;
      })
    );
  }

  assignProfessional(requestId: number, professionalId: number) {
    const request = this.getServiceRequestById(requestId);
    if (!request) {
      this.notificationService.addNotification(`Error: Service request #${requestId} not found.`);
      return;
    }
    const professional = this.getUserById(professionalId);
     if (!professional) {
      this.notificationService.addNotification(`Error: Professional with ID #${professionalId} not found.`);
      return;
    }

    this.updateServiceRequest(requestId, {
      professionalId: professionalId,
      status: 'Assigned',
      // Schedule 2 days from now
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) 
    });

    // Centralized notifications
    this.notificationService.addNotification(`Client: Your service "${request.title}" has been scheduled.`);
    this.notificationService.addNotification(`Professional: You have a new assignment: "${request.title}".`);
    this.notificationService.addNotification(`Admin: ${professional.name} assigned to "${request.title}".`);
  }

  submitQuote(requestId: number, cost: number) {
    this.updateServiceRequest(requestId, { cost, status: 'Quoted' });
    const request = this.getServiceRequestById(requestId);
    if(request) {
        this.notificationService.addNotification(`Client: A quote of $${cost.toFixed(2)} is ready for your service "${request.title}".`);
    }
  }

  respondToQuote(requestId: number, approved: boolean) {
    const request = this.getServiceRequestById(requestId);
    if (!request) return;

    if (approved) {
      this.updateServiceRequest(requestId, { status: 'Approved' });
      this.notificationService.addNotification(`Admin: Quote for "${request.title}" was approved by the client.`);
    } else {
      this.updateServiceRequest(requestId, { status: 'Cancelled' });
      this.notificationService.addNotification(`Admin: Quote for "${request.title}" was rejected by the client.`);
    }
  }
  
  processPayment(requestId: number) {
     const request = this.getServiceRequestById(requestId);
     if (request && request.cost) {
        this.updateServiceRequest(requestId, { paymentStatus: 'Paid' });
        this.notificationService.addNotification(`Payment of $${request.cost.toFixed(2)} for "${request.title}" was successful. Thank you!`);
        this.notificationService.addNotification(`Admin: Payment received for service #${requestId}.`);
     }
  }
  
  getProfessionalsByCategory(category: ServiceCategory): User[] {
    return this.users().filter(u => u.role === 'professional' && u.specialty === category);
  }

  addCategory(name: string): void {
    const trimmedName = name.trim();
    if (!trimmedName) {
      this.notificationService.addNotification('Category name cannot be empty.');
      return;
    }
    const existing = this.categories().find(c => c.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      this.notificationService.addNotification(`Category "${trimmedName}" already exists.`);
      return;
    }
    this._categories.update(cats => [...cats, trimmedName].sort());
    this.notificationService.addNotification(`Category "${trimmedName}" added successfully.`);
  }

  updateCategory(oldName: ServiceCategory, newName: string): void {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) {
      this.notificationService.addNotification('Category name cannot be empty.');
      return;
    }
    if (oldName.toLowerCase() !== trimmedNewName.toLowerCase()) {
      const existing = this.categories().find(c => c.toLowerCase() === trimmedNewName.toLowerCase());
      if (existing) {
        this.notificationService.addNotification(`Category "${trimmedNewName}" already exists.`);
        return;
      }
    }
    this._categories.update(cats => cats.map(c => c === oldName ? trimmedNewName : c).sort());
    this._users.update(users => users.map(u => u.specialty === oldName ? { ...u, specialty: trimmedNewName as ServiceCategory } : u));
    this._serviceRequests.update(requests => requests.map(r => r.category === oldName ? { ...r, category: trimmedNewName as ServiceCategory } : r));
    this.notificationService.addNotification(`Category "${oldName}" updated to "${trimmedNewName}".`);
  }

  deleteCategory(name: ServiceCategory): void {
    const isUsed = this.serviceRequests().some(r => r.category === name);
    if (isUsed) {
      this.notificationService.addNotification(`Não é possível excluir a categoria "${name}", pois ela está vinculada a uma ou mais solicitações de serviço.`);
      return;
    }
    this._users.update(users => users.map(u => u.specialty === name ? { ...u, specialty: null } : u));
    this._categories.update(cats => cats.filter(c => c !== name));
    this.notificationService.addNotification(`Category "${name}" deleted successfully.`);
  }
}