// FIX: Create the data models for the application.
export type UserRole = 'client' | 'professional' | 'admin';
export type UserStatus = 'Pending' | 'Active' | 'Rejected';
export type ServiceCategory = 'Plumbing' | 'Electrical' | 'Painting' | 'Gardening' | 'General Repair' | string;
export type ServiceStatus = 'Pending' | 'Quoted' | 'Approved' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Unpaid';

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
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string;
  specialties?: ServiceCategory[];
}

export interface ServiceRequest {
  id: number;
  clientId: number;
  professionalId: number | null;
  title: string;
  description: string;
  category: ServiceCategory;
  address: Address;
  status: ServiceStatus;
  requestedDate: Date;
  scheduledDate: Date | null;
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