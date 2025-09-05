export type UserRole = 'client' | 'professional' | 'admin';
export type UserStatus = 'Active' | 'Pending' | 'Rejected';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string;
  specialties?: ServiceCategory[];
  address?: Address;
}

export type ServiceCategory = 'Plumbing' | 'Electrical' | 'Painting' | 'Gardening' | 'General Repair';

export type ServiceStatus = 'Pending' | 'Quoted' | 'Approved' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';

export type PaymentStatus = 'Paid' | 'Unpaid';

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface ServiceRequest {
  id: number;
  clientId: number;
  professionalId: number | null;
  title: string;
  description: string;
  category: ServiceCategory;
  requestedDate: Date;
  scheduledDate: Date | null;
  status: ServiceStatus;
  cost: number | null;
  paymentStatus: PaymentStatus;
  address: Address;
}

export interface ChatMessage {
  id: number;
  serviceRequestId: number;
  senderId: number;
  text: string;
  timestamp: Date;
}

export interface Notification {
  id: number;
  message: string;
  timestamp: Date;
  read: boolean;
}
