import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import {
  User,
  ServiceRequest,
  ChatMessage,
  ServiceCategory,
  ServiceStatus,
  PaymentStatus,
  ServiceRequestPayload,
} from '../models/maintenance.models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private supabase = inject(SupabaseService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  // Signals for storing application data
  readonly users = signal<User[]>([]);
  readonly serviceRequests = signal<ServiceRequest[]>([]);
  readonly chatMessages = signal<ChatMessage[]>([]);
  // FIX: Make categories a signal so it can be updated from admin dashboard
  readonly categories = signal<ServiceCategory[]>(['Plumbing', 'Electrical', 'Cleaning', 'Gardening', 'Painting']);

  constructor() {
    this.listenToServiceRequestChanges();
    this.listenToUserChanges();
  }

  async loadInitialData(currentUser: User) {
    await this.fetchUsers();
    await this.fetchServiceRequests(currentUser);
  }

  clearData() {
    this.users.set([]);
    this.serviceRequests.set([]);
    this.chatMessages.set([]);
  }
  
  private async fetchUsers() {
    const { data, error } = await this.supabase.client.from('users').select('*');
    if (error) {
      this.notificationService.addNotification('Error fetching users: ' + error.message);
    } else {
      this.users.set(data as User[]);
    }
  }

  private async fetchServiceRequests(currentUser: User) {
    let query = this.supabase.client.from('service_requests').select('*');

    if (currentUser.role === 'client') {
      query = query.eq('client_auth_id', currentUser.auth_id);
    } else if (currentUser.role === 'professional') {
      query = query.or(`professional_auth_id.eq.${currentUser.auth_id},professional_id.is.null`);
    }
    // Admin sees all

    const { data, error } = await query;

    if (error) {
        this.notificationService.addNotification('Error fetching service requests: ' + error.message);
    } else if (data) {
        const users = this.users();
        const requests = (data as any[]).map(r => ({
          ...r,
          client_name: users.find(u => u.id === r.client_id)?.name || 'Unknown',
          professional_name: users.find(u => u.id === r.professional_id)?.name || 'Unassigned',
        }));
        this.serviceRequests.set(requests);
    }
  }
  
  async addServiceRequest(payload: ServiceRequestPayload) {
    const currentUser = this.authService.appUser();
    if (!currentUser) return;

    const newRequestData = {
        client_id: currentUser.id,
        client_auth_id: currentUser.auth_id,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        street: payload.address.street,
        city: payload.address.city,
        state: payload.address.state,
        zip_code: payload.address.zip_code,
        requested_date: new Date().toISOString(),
        status: 'Pending',
        payment_status: 'Unpaid'
    };
    
    const { error } = await this.supabase.client
        .from('service_requests')
        .insert(newRequestData);
    
    if (error) {
        this.notificationService.addNotification('Error creating service request: ' + error.message);
    } else {
        this.notificationService.addNotification('Service request created successfully!');
    }
  }
  
  async updateServiceRequest(id: number, updates: Partial<ServiceRequest>) {
     const { error } = await this.supabase.client
        .from('service_requests')
        .update(updates)
        .eq('id', id);

    if (error) {
        this.notificationService.addNotification('Error updating request: ' + error.message);
    }
  }
  
  getServiceRequestById(id: number): ServiceRequest | undefined {
    return this.serviceRequests().find(r => r.id === id);
  }

  respondToQuote(requestId: number, approved: boolean) {
    const status: ServiceStatus = approved ? 'Approved' : 'Pending';
    this.updateServiceRequest(requestId, { status });
    this.notificationService.addNotification(`Quote for request #${requestId} has been ${approved ? 'approved' : 'rejected'}.`);
  }

  async scheduleServiceRequest(requestId: number, professionalId: number, date: Date) {
    const professional = this.users().find(u => u.id === professionalId);
    if (!professional) return;
    
    const updates = {
      professional_id: professionalId,
      professional_auth_id: professional.auth_id,
      scheduled_date: date.toISOString(),
      status: 'Scheduled' as ServiceStatus
    };
    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(`Request #${requestId} scheduled successfully.`);
  }
  
  async updatePaymentStatus(requestId: number, paymentStatus: PaymentStatus) {
    await this.updateServiceRequest(requestId, { payment_status: paymentStatus });
  }

  getProfessionalsByCategory(category: ServiceCategory): User[] {
    return this.users().filter(u => u.role === 'professional' && u.specialties?.includes(category) && u.status === 'Active');
  }
  
  async updateUser(id: number, updates: Partial<User>) {
    const { error } = await this.supabase.client
        .from('users')
        .update(updates)
        .eq('id', id);
    if (error) {
        this.notificationService.addNotification(`Error updating user: ${error.message}`);
    } else {
        this.notificationService.addNotification(`User updated successfully.`);
    }
  }

  async fetchChatMessages(requestId: number) {
    const { data, error } = await this.supabase.client
      .from('chat_messages')
      .select('*')
      .eq('request_id', requestId)
      .order('timestamp', { ascending: true });
    
    if (error) {
      this.notificationService.addNotification('Error fetching messages: ' + error.message);
    } else {
      this.chatMessages.set(data as ChatMessage[]);
    }
  }
  
  async addChatMessage(requestId: number, senderId: number, text: string) {
    const currentUser = this.authService.appUser();
    if (!currentUser) return;
    
    const newMessage = {
      request_id: requestId,
      sender_id: senderId,
      sender_auth_id: currentUser.auth_id,
      text: text,
      timestamp: new Date().toISOString(),
    };
    
    const { error } = await this.supabase.client
      .from('chat_messages')
      .insert(newMessage);
      
    if (error) {
        this.notificationService.addNotification('Error sending message: ' + error.message);
    }
  }
  
  private listenToServiceRequestChanges() {
    this.supabase.client
        .channel('public:service_requests')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, () => {
            const user = this.authService.appUser();
            if (user) {
                this.fetchServiceRequests(user);
            }
        })
        .subscribe();
  }

  private listenToUserChanges() {
    this.supabase.client
        .channel('public:users')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
            this.fetchUsers();
        })
        .subscribe();
  }
}
