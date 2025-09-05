import { Injectable, signal, computed, inject } from '@angular/core';
import { User, ServiceRequest, ChatMessage, ServiceCategory, ServiceStatus, UserRole, PaymentStatus, Address, UserStatus } from '../models/maintenance.models';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private notificationService = inject(NotificationService);
  private idCounters = {
    users: 5,
    requests: 10,
    messages: 20
  };

  private _categories = signal<ServiceCategory[]>([
    'Plumbing', 'Electrical', 'Painting', 'Gardening', 'General Repair'
  ]);
  categories = this._categories.asReadonly();

  private _users = signal<User[]>([
    { id: 1, name: 'Alice Johnson', email: 'alice@email.com', role: 'client', status: 'Active', avatarUrl: 'https://picsum.photos/seed/alice/200' },
    { id: 2, name: 'Bob Williams', email: 'bob@email.com', role: 'professional', status: 'Active', avatarUrl: 'https://picsum.photos/seed/bob/200', specialties: ['Plumbing', 'General Repair'] },
    { id: 3, name: 'Charlie Brown', email: 'charlie@email.com', role: 'professional', status: 'Active', avatarUrl: 'https://picsum.photos/seed/charlie/200', specialties: ['Electrical', 'Painting'] },
    { id: 4, name: 'Diana Prince', email: 'admin@email.com', role: 'admin', status: 'Active', avatarUrl: 'https://picsum.photos/seed/diana/200' },
    { id: 5, name: 'Pending Pro', email: 'pending@pro.com', role: 'client', status: 'Pending', avatarUrl: 'https://picsum.photos/seed/pending/200' },
  ]);
  users = this._users.asReadonly();

  private _serviceRequests = signal<ServiceRequest[]>([
    { id: 1, clientId: 1, professionalId: 2, title: 'Leaky Faucet', description: 'My kitchen sink faucet is dripping constantly.', category: 'Plumbing', requestedDate: new Date('2024-05-10'), scheduledDate: new Date('2024-05-15'), status: 'Completed', cost: 150, paymentStatus: 'Paid', address: { street: '123 Maple St', city: 'Springfield', state: 'IL', zipCode: '62704' } },
    { id: 2, clientId: 1, professionalId: 3, title: 'Install Ceiling Fan', description: 'Need a new ceiling fan installed in the living room.', category: 'Electrical', requestedDate: new Date('2024-05-12'), scheduledDate: new Date('2024-05-18'), status: 'In Progress', cost: 250, paymentStatus: 'Unpaid', address: { street: '123 Maple St', city: 'Springfield', state: 'IL', zipCode: '62704' } },
    { id: 3, clientId: 1, professionalId: null, title: 'Paint Bedroom', description: 'The master bedroom needs a new coat of paint.', category: 'Painting', requestedDate: new Date('2024-05-20'), scheduledDate: null, status: 'Quoted', cost: 800, paymentStatus: 'Unpaid', address: { street: '123 Maple St', city: 'Springfield', state: 'IL', zipCode: '62704' } },
    { id: 4, clientId: 1, professionalId: null, title: 'Garden Weeding', description: 'The front garden is overgrown with weeds.', category: 'Gardening', requestedDate: new Date('2024-05-25'), scheduledDate: null, status: 'Pending', cost: null, paymentStatus: 'Unpaid', address: { street: '123 Maple St', city: 'Springfield', state: 'IL', zipCode: '62704' } },
    { id: 5, clientId: 1, professionalId: 2, title: 'Fix broken door hinge', description: 'The hinge on the bathroom door is broken and needs to be replaced.', category: 'General Repair', requestedDate: new Date('2024-06-01'), scheduledDate: new Date('2024-06-05'), status: 'Assigned', cost: 75, paymentStatus: 'Unpaid', address: { street: '456 Oak Ave', city: 'Springfield', state: 'IL', zipCode: '62704' } },
  ]);
  serviceRequests = this._serviceRequests.asReadonly();

  private _messages = signal<ChatMessage[]>([
    { id: 1, serviceRequestId: 2, senderId: 1, text: 'Hi, when can you start?', timestamp: new Date() },
    { id: 2, serviceRequestId: 2, senderId: 3, text: 'I can be there tomorrow at 10 AM.', timestamp: new Date() },
  ]);
  messages = this._messages.asReadonly();

  // --- Getters ---
  getUserById(id: number): User | undefined {
    return this.users().find(u => u.id === id);
  }

  getServiceRequestById(id: number): ServiceRequest | undefined {
    return this.serviceRequests().find(r => r.id === id);
  }
  
  getMessagesForService(serviceRequestId: number): ChatMessage[] {
    return this.messages().filter(m => m.serviceRequestId === serviceRequestId).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getProfessionalsByCategory(category: ServiceCategory): User[] {
    return this.users().filter(u => u.role === 'professional' && u.specialties?.includes(category));
  }

  // --- Mutations ---

  addServiceRequest(request: Omit<ServiceRequest, 'id' | 'professionalId' | 'scheduledDate' | 'status' | 'cost' | 'paymentStatus'>) {
    this.idCounters.requests++;
    const newRequest: ServiceRequest = {
      ...request,
      id: this.idCounters.requests,
      professionalId: null,
      scheduledDate: null,
      status: 'Pending',
      cost: null,
      paymentStatus: 'Unpaid',
    };
    this._serviceRequests.update(requests => [...requests, newRequest]);
    this.notificationService.addNotification(`New request "${newRequest.title}" submitted.`);
  }

  addMessage(serviceRequestId: number, senderId: number, text: string) {
    this.idCounters.messages++;
    const newMessage: ChatMessage = {
      id: this.idCounters.messages,
      serviceRequestId,
      senderId,
      text,
      timestamp: new Date()
    };
    this._messages.update(messages => [...messages, newMessage]);
  }

  approveClient(userId: number) {
    this._users.update(users => users.map(u => u.id === userId ? { ...u, status: 'Active' as UserStatus } : u));
    this.notificationService.addNotification(`Client account approved.`);
  }
  
  rejectClient(userId: number) {
    this._users.update(users => users.map(u => u.id === userId ? { ...u, status: 'Rejected' as UserStatus } : u));
    this.notificationService.addNotification(`Client account rejected.`);
  }

  submitQuote(requestId: number, amount: number) {
    this._serviceRequests.update(reqs => reqs.map(r => r.id === requestId ? { ...r, cost: amount, status: 'Quoted' as ServiceStatus } : r));
    this.notificationService.addNotification(`Quote of $${amount} submitted for request #${requestId}.`);
  }

  respondToQuote(requestId: number, approved: boolean) {
    this._serviceRequests.update(reqs => reqs.map(r => {
      if (r.id === requestId) {
        return { ...r, status: (approved ? 'Approved' : 'Pending') as ServiceStatus };
      }
      return r;
    }));
    this.notificationService.addNotification(`Quote for request #${requestId} has been ${approved ? 'approved' : 'rejected'}.`);
  }
  
  assignProfessional(requestId: number, professionalId: number) {
    this._serviceRequests.update(reqs => reqs.map(r => {
      if (r.id === requestId) {
        return { ...r, professionalId, status: 'Assigned' as ServiceStatus, scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) }; // schedule 3 days out
      }
      return r;
    }));
    this.notificationService.addNotification(`Professional assigned to request #${requestId}.`);
  }
  
  updateUser(userId: number, updates: Partial<User>) {
    this._users.update(users => users.map(u => u.id === userId ? { ...u, ...updates } : u));
    this.notificationService.addNotification(`Profile for user #${userId} updated.`);
  }

  addCategory(categoryName: ServiceCategory) {
    if (!this._categories().includes(categoryName)) {
      this._categories.update(cats => [...cats, categoryName]);
      this.notificationService.addNotification(`Category "${categoryName}" added.`);
    }
  }

  updateCategory(oldName: ServiceCategory, newName: ServiceCategory) {
    this._categories.update(cats => cats.map(c => c === oldName ? newName : c));
    this._serviceRequests.update(reqs => reqs.map(r => r.category === oldName ? { ...r, category: newName } : r));
    this._users.update(users => users.map(u => ({ ...u, specialties: u.specialties?.map(s => s === oldName ? newName : s) })));
    this.notificationService.addNotification(`Category "${oldName}" updated to "${newName}".`);
  }

  deleteCategory(categoryName: ServiceCategory) {
    // Basic deletion, doesn't handle re-assigning requests or specialties
    this._categories.update(cats => cats.filter(c => c !== categoryName));
    this.notificationService.addNotification(`Category "${categoryName}" deleted.`);
  }
  
  addProfessional(name: string, email: string, specialties: ServiceCategory[]) {
    this.idCounters.users++;
    const newUser: User = {
      id: this.idCounters.users,
      name,
      email,
      role: 'professional',
      status: 'Active',
      avatarUrl: `https://picsum.photos/seed/${name.split(' ')[0]}/200`,
      specialties,
    };
    this._users.update(users => [...users, newUser]);
    this.notificationService.addNotification(`Professional "${name}" added.`);
  }
}
