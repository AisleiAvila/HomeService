export type ServiceCategory = string;

export type ServiceStatus = 'Pending' | 'Quoted' | 'Approved' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';

export type UserRole = 'client' | 'professional' | 'admin';

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
  role: UserRole;
  avatarUrl?: string;
  specialties?: ServiceCategory[]; // For professionals
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
  paymentStatus: 'Unpaid' | 'Paid';
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