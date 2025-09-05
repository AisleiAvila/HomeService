// FIX: Implement the data service with mock data and methods.
import { Injectable, signal, inject } from '@angular/core';
import { User, ServiceRequest, ChatMessage, ServiceCategory, ServiceStatus } from '../models/maintenance.models';
import { NotificationService } from './notification.service';
import { PushNotificationService, PushNotificationPayload } from './push-notification.service';
import { I18nService } from './i18n.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private notificationService = inject(NotificationService);
  private pushNotificationService = inject(PushNotificationService);
  private i18n = inject(I18nService);

  private userIdCounter = 10;
  private requestIdCounter = 10;
  private messageIdCounter = 10;

  private _users = signal<User[]>([
    { id: 1, name: 'Alice Johnson', email: 'client@email.com', phone: '111-222-3333', role: 'client', status: 'Active', avatarUrl: 'https://picsum.photos/id/1027/200/200' },
    { id: 2, name: 'Bob Williams', email: 'professional@email.com', phone: '222-333-4444', role: 'professional', status: 'Active', avatarUrl: 'https://picsum.photos/id/1005/200/200', specialties: ['Plumbing', 'General Repair'] },
    { id: 3, name: 'Charlie Brown', email: 'admin@email.com', phone: '333-444-5555', role: 'admin', status: 'Active', avatarUrl: 'https://picsum.photos/id/1025/200/200' },
    { id: 4, name: 'Diana Miller', email: 'pro2@email.com', phone: '444-555-6666', role: 'professional', status: 'Active', avatarUrl: 'https://picsum.photos/id/1011/200/200', specialties: ['Electrical', 'Painting'] },
    { id: 5, name: 'Eve Davis', email: 'client2@email.com', phone: '555-666-7777', role: 'client', status: 'Pending', avatarUrl: 'https://picsum.photos/id/1012/200/200' },
    { id: 6, name: 'Frank White', email: 'pro3@email.com', phone: '666-777-8888', role: 'professional', status: 'Pending', avatarUrl: 'https://picsum.photos/id/1013/200/200', specialties: ['Gardening'] },
  ]);

  private _serviceRequests = signal<ServiceRequest[]>([
    {
      id: 1,
      clientId: 1,
      professionalId: 2,
      title: 'Fix leaky faucet in bathroom',
      description: 'The faucet in the master bathroom is constantly dripping. It seems to be coming from the base of the handle.',
      category: 'Plumbing',
      address: { street: '123 Main St', city: 'Anytown', state: 'CA', zipCode: '12345' },
      status: 'In Progress',
      requestedDate: new Date('2024-05-10'),
      scheduledDate: new Date('2024-05-20'),
      cost: 150,
      paymentStatus: 'Unpaid'
    },
    {
      id: 2,
      clientId: 1,
      professionalId: 4,
      title: 'Paint the living room',
      description: 'Need the living room walls painted. Color is a light beige. I have the paint already.',
      category: 'Painting',
      address: { street: '123 Main St', city: 'Anytown', state: 'CA', zipCode: '12345' },
      status: 'Completed',
      requestedDate: new Date('2024-04-15'),
      scheduledDate: new Date('2024-04-25'),
      cost: 450,
      paymentStatus: 'Paid'
    },
    {
      id: 3,
      clientId: 5,
      professionalId: null,
      title: 'Install new ceiling fan',
      description: 'I bought a new ceiling fan for the bedroom and need it installed. The old fixture needs to be removed.',
      category: 'Electrical',
      address: { street: '456 Oak Ave', city: 'Someplace', state: 'NY', zipCode: '54321' },
      status: 'Pending',
      requestedDate: new Date('2024-05-18'),
      scheduledDate: null,
      cost: null,
      paymentStatus: 'Unpaid'
    },
    {
      id: 4,
      clientId: 1,
      professionalId: null,
      title: 'Garden maintenance',
      description: 'The front yard garden needs weeding and mulching.',
      category: 'Gardening',
      address: { street: '123 Main St', city: 'Anytown', state: 'CA', zipCode: '12345' },
      status: 'Quoted',
      requestedDate: new Date('2024-05-19'),
      scheduledDate: null,
      cost: 200,
      paymentStatus: 'Unpaid'
    },
  ]);

  private _chatMessages = signal<ChatMessage[]>([
    { id: 1, serviceRequestId: 1, senderId: 1, text: 'Hi Bob, when do you think you can start?', timestamp: new Date(new Date().setDate(new Date().getDate() - 1)) },
    { id: 2, serviceRequestId: 1, senderId: 2, text: 'Hi Alice, I can be there tomorrow morning around 9 AM.', timestamp: new Date() },
  ]);
  
  private _categories = signal<ServiceCategory[]>([
    'Plumbing', 'Electrical', 'Painting', 'Gardening', 'General Repair'
  ]);
  
  // Public readonly signals
  readonly users = this._users.asReadonly();
  readonly serviceRequests = this._serviceRequests.asReadonly();
  readonly categories = this._categories.asReadonly();
  
  // Methods to interact with data
  getUserById(id: number): User | undefined {
    return this.users().find(u => u.id === id);
  }

  getServiceRequestById(id: number): ServiceRequest | undefined {
    return this.serviceRequests().find(r => r.id === id);
  }

  getMessagesForService(serviceRequestId: number): ChatMessage[] {
    return this._chatMessages().filter(m => m.serviceRequestId === serviceRequestId).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  addMessage(serviceRequestId: number, senderId: number, text: string): void {
    const newMessage: ChatMessage = {
      id: this.messageIdCounter++,
      serviceRequestId,
      senderId,
      text,
      timestamp: new Date()
    };
    this._chatMessages.update(messages => [...messages, newMessage]);
  }
  
  addServiceRequest(requestData: Omit<ServiceRequest, 'id' | 'status' | 'professionalId' | 'scheduledDate' | 'cost' | 'paymentStatus'>) {
    const newRequest: ServiceRequest = {
      ...requestData,
      id: this.requestIdCounter++,
      status: 'Pending',
      professionalId: null,
      scheduledDate: null,
      cost: null,
      paymentStatus: 'Unpaid',
    };
    this._serviceRequests.update(requests => [newRequest, ...requests]);
    this.notificationService.addNotification(this.i18n.translate('requestSubmittedNotification', {title: newRequest.title}));
  }

  approveClient(userId: number) {
    this._users.update(users => users.map(u => u.id === userId ? { ...u, status: 'Active' } : u));
    this.notificationService.addNotification(this.i18n.translate('clientAccountApproved'));

    // Send push notification to the approved client
    const user = this.getUserById(userId);
    if (user) {
        const payload: PushNotificationPayload = {
            title: this.i18n.translate('pushAccountApprovedTitle'),
            body: this.i18n.translate('pushAccountApprovedBody', { name: user.name })
        };
        this.pushNotificationService.sendNotification(payload);
    }
  }

  rejectClient(userId: number) {
    this._users.update(users => users.map(u => u.id === userId ? { ...u, status: 'Rejected' } : u));
    this.notificationService.addNotification(this.i18n.translate('clientAccountRejected'));
  }

  submitQuote(requestId: number, amount: number) {
    this._serviceRequests.update(requests => requests.map(r => r.id === requestId ? { ...r, cost: amount, status: 'Quoted' } : r));
    const amountStr = this.i18n.language() === 'pt' ? `R$${amount.toFixed(2)}` : `$${amount.toFixed(2)}`;
    this.notificationService.addNotification(this.i18n.translate('quoteSubmittedNotification', {id: requestId, amount: amountStr}));

    // Send push notification to the client
    const request = this.getServiceRequestById(requestId);
    if (request) {
        const payload: PushNotificationPayload = {
            title: this.i18n.translate('pushQuoteReceivedTitle'),
            body: this.i18n.translate('pushQuoteReceivedBody', { title: request.title, amount: amountStr })
        };
        this.pushNotificationService.sendNotification(payload);
    }
  }
  
  respondToQuote(requestId: number, approved: boolean) {
    const status: ServiceStatus = approved ? 'Approved' : 'Pending'; // Back to pending if rejected
    this._serviceRequests.update(requests => requests.map(r => r.id === requestId ? { ...r, status } : r));
    const statusStr = approved ? this.i18n.translate('approvedStatus') : this.i18n.translate('rejectedStatus');
    this.notificationService.addNotification(this.i18n.translate('quoteResponseNotification', {id: requestId, status: statusStr}));

    // Send push notification to the professional
    const request = this.getServiceRequestById(requestId);
    if (request && request.professionalId) {
        const payload: PushNotificationPayload = {
            title: this.i18n.translate('pushQuoteResponseTitle'),
            body: this.i18n.translate('pushQuoteResponseBody', { title: request.title, status: statusStr })
        };
        this.pushNotificationService.sendNotification(payload);
    }
  }

  assignProfessional(requestId: number, professionalId: number) {
    this._serviceRequests.update(requests => requests.map(r => r.id === requestId ? { ...r, professionalId, status: 'Assigned', scheduledDate: new Date(new Date().setDate(new Date().getDate() + 7)) } : r)); // schedule for a week later
    this.notificationService.addNotification(this.i18n.translate('professionalAssignedNotification', {id: requestId}));
     // Send push notification to the professional
    const request = this.getServiceRequestById(requestId);
    if (request) {
        const payload: PushNotificationPayload = {
            title: this.i18n.translate('pushJobAssignedTitle'),
            body: this.i18n.translate('pushJobAssignedBody', { title: request.title })
        };
        this.pushNotificationService.sendNotification(payload);
    }
  }
  
  scheduleAppointment(requestId: number, professionalId: number, dateTime: Date) {
    this._serviceRequests.update(requests => 
      requests.map(r => 
        r.id === requestId 
          ? { ...r, professionalId, scheduledDate: dateTime, status: 'Scheduled' } 
          : r
      )
    );
    const request = this.getServiceRequestById(requestId);
    if (request) {
      this.notificationService.addNotification(this.i18n.translate('appointmentScheduledNotification', { title: request.title }));
      // Send push notification to the professional
      const payload: PushNotificationPayload = {
          title: this.i18n.translate('pushAppointmentScheduledTitle'),
          body: this.i18n.translate('pushAppointmentScheduledBody', { title: request.title, date: dateTime.toLocaleString() })
      };
      this.pushNotificationService.sendNotification(payload);
    }
  }

  updateUser(userId: number, updates: Partial<User>) {
    this._users.update(users => users.map(u => u.id === userId ? { ...u, ...updates } : u));
    this.notificationService.addNotification(this.i18n.translate('profileUpdatedNotification', { id: userId }));
  }

  addCategory(category: ServiceCategory) {
    if (this._categories().includes(category)) return;
    this._categories.update(cats => [...cats, category]);
    this.notificationService.addNotification(this.i18n.translate('categoryAddedNotification', {category: category}));
  }

  updateCategory(oldName: ServiceCategory, newName: ServiceCategory) {
    if (this._categories().includes(newName)) return;
    this._categories.update(cats => cats.map(c => c === oldName ? newName : c));
    this._serviceRequests.update(reqs => reqs.map(r => r.category === oldName ? {...r, category: newName} : r));
    this._users.update(users => users.map(u => ({...u, specialties: u.specialties?.map(s => s === oldName ? newName : s)})))
    this.notificationService.addNotification(this.i18n.translate('categoryUpdatedNotification', { oldName, newName }));
  }
  
  deleteCategory(category: ServiceCategory) {
    this._categories.update(cats => cats.filter(c => c !== category));
    // Optionally handle what happens to requests/professionals with this category. For now, we leave them.
    this.notificationService.addNotification(this.i18n.translate('categoryDeletedNotification', { category }));
  }

  addProfessional(name: string, email: string, specialties: ServiceCategory[]) {
    const newUser: User = {
      id: this.userIdCounter++,
      name,
      email,
      role: 'professional',
      status: 'Active',
      avatarUrl: 'https://picsum.photos/seed/' + name + '/200/200',
      specialties,
    };
    this._users.update(users => [...users, newUser]);
    this.notificationService.addNotification(this.i18n.translate('professionalAddedNotification', { name }));
  }
  
  getProfessionalsByCategory(category: ServiceCategory): User[] {
    return this.users().filter(u => u.role === 'professional' && u.status === 'Active' && u.specialties?.includes(category));
  }
}
