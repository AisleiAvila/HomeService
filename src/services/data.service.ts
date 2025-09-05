

import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { NotificationService } from './notification.service';
// FIX: Corrected import path for I18nService
import { I18nService } from './i18n.service';
import { 
  User, 
  ServiceRequest, 
  ChatMessage, 
  ServiceCategory, 
  UserRole, 
  PaymentStatus 
} from '../models/maintenance.models';
import { ServiceRequestPayload } from '../components/service-request-form/service-request-form.component';
import { PostgrestError } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private supabase = inject(SupabaseService);
  private notificationService = inject(NotificationService);
  private i18n = inject(I18nService);

  // Signals for storing application data
  readonly users = signal<User[]>([]);
  readonly serviceRequests = signal<ServiceRequest[]>([]);
  readonly chatMessages = signal<ChatMessage[]>([]);
  readonly categories = signal<ServiceCategory[]>(['Plumbing', 'Electrical', 'Cleaning', 'Gardening', 'Painting']);

  // Computed signal for professionals
  readonly professionals = computed(() => this.users().filter(u => u.role === 'professional' && u.status === 'Active'));

  private handleError(error: PostgrestError | null, context: string) {
    if (error) {
      console.error(`Error in ${context}:`, error);
      this.notificationService.addNotification(`Error in ${context}: ${error.message}`);
    }
  }

  async loadInitialData(currentUser: User) {
    await this.fetchUsers();
    await this.fetchServiceRequests(currentUser);
    // Chat messages could be loaded on-demand when a chat is opened
  }
  
  clearData() {
    this.users.set([]);
    this.serviceRequests.set([]);
    this.chatMessages.set([]);
  }

  async fetchUsers() {
    const { data, error } = await this.supabase.client.from('users').select('*');
    this.handleError(error, 'fetching users');
    if (data) {
      this.users.set(data as User[]);
    }
  }

  async fetchServiceRequests(currentUser: User) {
    let query = this.supabase.client.from('service_requests').select('*');

    if (currentUser.role === 'client') {
      query = query.eq('client_id', currentUser.id);
    } else if (currentUser.role === 'professional') {
      query = query.eq('professional_id', currentUser.id);
    }
    // Admin sees all requests

    const { data, error } = await query.order('requested_date', { ascending: false });
    this.handleError(error, 'fetching service requests');
    if (data) {
      this.serviceRequests.set(data as ServiceRequest[]);
    }
  }

  async fetchChatMessages(requestId: number) {
    const { data, error } = await this.supabase.client
      .from('chat_messages')
      .select('*')
      .eq('request_id', requestId)
      .order('timestamp', { ascending: true });
    
    this.handleError(error, `fetching messages for request ${requestId}`);
    if (data) {
      this.chatMessages.update(currentMessages => {
        const otherMessages = currentMessages.filter(m => m.request_id !== requestId);
        return [...otherMessages, ...(data as ChatMessage[])];
      });
    }
  }
  
  getServiceRequestById(id: number): ServiceRequest | undefined {
    return this.serviceRequests().find(r => r.id === id);
  }

  getProfessionalsByCategory(category: ServiceCategory): User[] {
    return this.professionals().filter(p => p.specialties?.includes(category));
  }

  async respondToQuote(requestId: number, approved: boolean) {
    const newStatus = approved ? 'Approved' : 'Pending'; // Or 'Cancelled' depending on flow
    const { data, error } = await this.supabase.client
      .from('service_requests')
      .update({ status: newStatus })
      .eq('id', requestId)
      .select()
      .single();

    this.handleError(error, 'responding to quote');
    if (data) {
      this.serviceRequests.update(requests => 
        requests.map(r => r.id === requestId ? { ...r, status: newStatus } : r)
      );
      this.notificationService.addNotification(`Quote for request #${requestId} has been ${approved ? 'approved' : 'rejected'}.`);
    }
  }
  
  async scheduleServiceRequest(requestId: number, professionalId: number, date: Date) {
      const { data, error } = await this.supabase.client
        .from('service_requests')
        .update({ 
          professional_id: professionalId,
          scheduled_date: date.toISOString(),
          status: 'Scheduled'
        })
        .eq('id', requestId)
        .select()
        .single();
      
      this.handleError(error, 'scheduling request');
      if(data) {
        this.serviceRequests.update(reqs => reqs.map(r => r.id === requestId ? data as ServiceRequest : r));
        this.notificationService.addNotification(`Request #${requestId} has been scheduled.`);
      }
  }

  async addServiceRequest(payload: ServiceRequestPayload) {
    const { data, error } = await this.supabase.client
      .from('service_requests')
      .insert([payload])
      .select()
      .single();
    
    this.handleError(error, 'creating service request');
    if (data) {
      this.serviceRequests.update(reqs => [data as ServiceRequest, ...reqs]);
      this.notificationService.addNotification('New service request created successfully!');
    }
  }

  async addChatMessage(requestId: number, senderId: number, text: string) {
    const { data, error } = await this.supabase.client
      .from('chat_messages')
      .insert([{ request_id: requestId, sender_id: senderId, text }])
      .select()
      .single();

    this.handleError(error, 'sending chat message');
    if(data) {
        this.chatMessages.update(msgs => [...msgs, data as ChatMessage]);
    }
  }
  
  async updatePaymentStatus(requestId: number, status: PaymentStatus) {
    const { data, error } = await this.supabase.client
      .from('service_requests')
      .update({ payment_status: status })
      .eq('id', requestId)
      .select()
      .single();

    this.handleError(error, 'updating payment status');
    if (data) {
      this.serviceRequests.update(reqs => reqs.map(r => r.id === requestId ? data as ServiceRequest : r));
      this.notificationService.addNotification(`Payment status for request #${requestId} updated to ${status}.`);
    }
  }

  async updateUserStatus(userId: number, status: 'Active' | 'Rejected') {
    const { data, error } = await this.supabase.client
        .from('users')
        .update({ status })
        .eq('id', userId)
        .select()
        .single();
    
    this.handleError(error, 'updating user status');
    if (data) {
        this.users.update(users => users.map(u => u.id === userId ? data as User : u));
        this.notificationService.addNotification(`User ${data.name} has been ${status.toLowerCase()}.`);
    }
  }
}