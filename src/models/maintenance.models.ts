export type Role = 'client' | 'professional' | 'admin';
export type ServiceStatus = 'Pending' | 'Quoted' | 'Approved' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Unpaid';
export type ServiceCategory = 'Plumbing' | 'Electrical' | 'Painting' | 'Gardening' | 'General Repair';
export type UserStatus = 'Active' | 'Pending';

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string;
  specialties?: ServiceCategory[];
  phone: string;
  password?: string;
  status: UserStatus;
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
  address: Address;
  cost: number | null;
  paymentStatus: PaymentStatus;
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
