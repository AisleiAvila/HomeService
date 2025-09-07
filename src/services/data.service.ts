import { Injectable, signal, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { NotificationService } from "./notification.service";
import { AuthService } from "./auth.service";
import { I18nService } from "./i18n.service";
import {
  User,
  ServiceRequest,
  ChatMessage,
  ServiceCategory,
  ServiceStatus,
  PaymentStatus,
  ServiceRequestPayload,
} from "../models/maintenance.models";

@Injectable({
  providedIn: "root",
})
export class DataService {
  private supabase = inject(SupabaseService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private i18n = inject(I18nService);

  // Signals for storing application data
  readonly users = signal<User[]>([
    // Mock data for development
    {
      id: 1,
      auth_id: "admin-123",
      name: "Admin User",
      email: "admin@homeservice.com",
      role: "admin",
      status: "Active",
      avatar_url: "https://i.pravatar.cc/100?img=1",
    },
    {
      id: 2,
      auth_id: "client-123",
      name: "John Doe",
      email: "john@example.com",
      role: "client",
      status: "Active",
      avatar_url: "https://i.pravatar.cc/100?img=2",
      phone: "+1 (555) 123-4567",
    },
    {
      id: 3,
      auth_id: "pro-123",
      name: "Jane Smith",
      email: "jane@example.com",
      role: "professional",
      status: "Pending",
      avatar_url: "https://i.pravatar.cc/100?img=3",
      phone: "+1 (555) 987-6543",
      specialties: ["Plumbing", "Electrical"],
    },
    {
      id: 4,
      auth_id: "pro-456",
      name: "Mike Johnson",
      email: "mike@example.com",
      role: "professional",
      status: "Active",
      avatar_url: "https://i.pravatar.cc/100?img=4",
      phone: "+1 (555) 456-7890",
      specialties: ["Cleaning", "Gardening"],
    },
  ]);

  readonly serviceRequests = signal<ServiceRequest[]>([
    // Mock data for development
    {
      id: 1,
      client_id: 2,
      professional_id: 4,
      client_auth_id: "client-123",
      professional_auth_id: "pro-456",
      title: "Kitchen Sink Repair",
      description: "Kitchen sink is leaking and needs immediate repair.",
      category: "Plumbing",
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      zip_code: "12345",
      status: "Completed",
      payment_status: "Paid",
      requested_date: "2024-03-01T10:00:00Z",
      scheduled_date: "2024-03-02T14:00:00Z",
      cost: 150.00,
      client_name: "John Doe",
      professional_name: "Mike Johnson",
    },
    {
      id: 2,
      client_id: 2,
      professional_id: null,
      client_auth_id: "client-123",
      professional_auth_id: null,
      title: "Electrical Outlet Installation",
      description: "Need to install new electrical outlets in the living room.",
      category: "Electrical",
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      zip_code: "12345",
      status: "Pending",
      payment_status: "Unpaid",
      requested_date: "2024-03-05T09:00:00Z",
      scheduled_date: null,
      cost: null,
      client_name: "John Doe",
      professional_name: "Unassigned",
    },
    {
      id: 3,
      client_id: 2,
      professional_id: 4,
      client_auth_id: "client-123",
      professional_auth_id: "pro-456",
      title: "Deep House Cleaning",
      description: "Weekly deep cleaning service for 3-bedroom house.",
      category: "Cleaning",
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      zip_code: "12345",
      status: "In Progress",
      payment_status: "Unpaid",
      requested_date: "2024-03-03T08:00:00Z",
      scheduled_date: "2024-03-06T10:00:00Z",
      cost: 120.00,
      client_name: "John Doe",
      professional_name: "Mike Johnson",
    },
    {
      id: 4,
      client_id: 2,
      professional_id: null,
      client_auth_id: "client-123",
      professional_auth_id: null,
      title: "Garden Maintenance",
      description: "Monthly garden maintenance and lawn care.",
      category: "Gardening",
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      zip_code: "12345",
      status: "Quoted",
      payment_status: "Unpaid",
      requested_date: "2024-03-04T11:00:00Z",
      scheduled_date: null,
      cost: 80.00,
      client_name: "John Doe",
      professional_name: "Unassigned",
    },
    {
      id: 5,
      client_id: 2,
      professional_id: 4,
      client_auth_id: "client-123",
      professional_auth_id: "pro-456",
      title: "Living Room Painting",
      description: "Paint living room walls with premium paint.",
      category: "Painting",
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      zip_code: "12345",
      status: "Completed",
      payment_status: "Paid",
      requested_date: "2024-02-28T13:00:00Z",
      scheduled_date: "2024-03-01T09:00:00Z",
      cost: 300.00,
      client_name: "John Doe",
      professional_name: "Mike Johnson",
    },
  ]);

  readonly chatMessages = signal<ChatMessage[]>([]);
  // FIX: Make categories a signal so it can be updated from admin dashboard
  readonly categories = signal<ServiceCategory[]>([
    "Plumbing",
    "Electrical",
    "Cleaning",
    "Gardening",
    "Painting",
  ]);

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
    const { data, error } = await this.supabase.client
      .from("users")
      .select("*");
    if (error) {
      this.notificationService.addNotification(
        "Error fetching users: " + error.message
      );
    } else {
      this.users.set(data as User[]);
    }
  }

  private async fetchServiceRequests(currentUser: User) {
    let query = this.supabase.client.from("service_requests").select("*");

    if (currentUser.role === "client") {
      query = query.eq("client_auth_id", currentUser.auth_id);
    } else if (currentUser.role === "professional") {
      query = query.or(
        `professional_auth_id.eq.${currentUser.auth_id},professional_id.is.null`
      );
    }
    // Admin sees all

    const { data, error } = await query;

    if (error) {
      this.notificationService.addNotification(
        "Error fetching service requests: " + error.message
      );
    } else if (data) {
      const users = this.users();
      const requests = (data as any[]).map((r) => ({
        ...r,
        client_name: users.find((u) => u.id === r.client_id)?.name || "Unknown",
        professional_name:
          users.find((u) => u.id === r.professional_id)?.name || "Unassigned",
      }));
      this.serviceRequests.set(requests);
    }
  }

  async addServiceRequest(payload: ServiceRequestPayload) {
    const currentUser = this.authService.appUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

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
      status: "Pending",
      payment_status: "Unpaid",
    };

    const { error } = await this.supabase.client
      .from("service_requests")
      .insert(newRequestData);

    if (error) {
      this.notificationService.addNotification(
        "Error creating service request: " + error.message
      );
      throw error;
    } else {
      this.notificationService.addNotification(
        "Service request created successfully!"
      );
      // Reload service requests to show the new one
      const currentUser = this.authService.appUser();
      if (currentUser) {
        await this.fetchServiceRequests(currentUser);
      }
      return true;
    }
  }

  async updateServiceRequest(id: number, updates: Partial<ServiceRequest>) {
    // Get current request to track status changes
    const currentRequest = this.getServiceRequestById(id);

    const { error } = await this.supabase.client
      .from("service_requests")
      .update(updates)
      .eq("id", id);

    if (error) {
      this.notificationService.addNotification(
        "Error updating request: " + error.message
      );
    } else {
      // Notify about status changes
      if (
        updates.status &&
        currentRequest &&
        currentRequest.status !== updates.status
      ) {
        this.notificationService.addNotification(
          this.i18n.translate("statusChangedFromTo", {
            id: id.toString(),
            from: currentRequest.status,
            to: updates.status,
          })
        );
      }

      // Notify about payment status changes
      if (
        updates.payment_status &&
        currentRequest &&
        currentRequest.payment_status !== updates.payment_status
      ) {
        this.notificationService.addNotification(
          this.i18n.translate("paymentStatusChanged", {
            id: id.toString(),
            status: updates.payment_status,
          })
        );
      }
    }
  }

  getServiceRequestById(id: number): ServiceRequest | undefined {
    return this.serviceRequests().find((r) => r.id === id);
  }

  respondToQuote(requestId: number, approved: boolean) {
    const status: ServiceStatus = approved ? "Approved" : "Pending";
    this.updateServiceRequest(requestId, { status });
    this.notificationService.addNotification(
      `Quote for request #${requestId} has been ${
        approved ? "approved" : "rejected"
      }.`
    );
  }

  async scheduleServiceRequest(
    requestId: number,
    professionalId: number,
    scheduledDate: Date
  ) {
    const updates = {
      professional_id: professionalId,
      scheduled_date: scheduledDate.toISOString(),
      status: "Scheduled" as ServiceStatus,
    };

    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      `Service request #${requestId} has been scheduled.`
    );
  }

  async updatePaymentStatus(requestId: number, paymentStatus: PaymentStatus) {
    await this.updateServiceRequest(requestId, {
      payment_status: paymentStatus,
    });
    this.notificationService.addNotification(
      this.i18n.translate("paymentStatusChanged", {
        id: requestId.toString(),
        status: paymentStatus,
      })
    );
  }

  async updateUser(userId: number, updates: Partial<User>) {
    const { error } = await this.supabase.client
      .from("users")
      .update(updates)
      .eq("id", userId);

    if (error) {
      this.notificationService.addNotification(
        "Error updating user: " + error.message
      );
    } else {
      // Refresh users data
      await this.fetchUsers();

      // Notify about user updates
      if (updates.status) {
        this.notificationService.addNotification(
          this.i18n.translate("userStatusUpdated", {
            id: userId.toString(),
            status: updates.status,
          })
        );
      }
    }
  }

  getProfessionalsByCategory(category: ServiceCategory): User[] {
    return this.users().filter(
      (user) =>
        user.role === "professional" &&
        user.status === "Active" &&
        (user.specialties?.includes(category) || !user.specialties?.length)
    );
  }

  async fetchChatMessages(requestId: number) {
    const { data, error } = await this.supabase.client
      .from("chat_messages")
      .select("*")
      .eq("request_id", requestId)
      .order("timestamp", { ascending: true });

    if (error) {
      this.notificationService.addNotification(
        "Error fetching messages: " + error.message
      );
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
      .from("chat_messages")
      .insert(newMessage);

    if (error) {
      this.notificationService.addNotification(
        "Error sending message: " + error.message
      );
    }
  }

  private listenToServiceRequestChanges() {
    this.supabase.client
      .channel("public:service_requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests" },
        () => {
          const user = this.authService.appUser();
          if (user) {
            this.fetchServiceRequests(user);
          }
        }
      )
      .subscribe();
  }

  private listenToUserChanges() {
    this.supabase.client
      .channel("public:users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          this.fetchUsers();
        }
      )
      .subscribe();
  }
}
