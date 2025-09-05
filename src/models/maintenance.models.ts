export type UserRole = 'client' | 'professional' | 'admin';
export type UserStatus = 'Pending' | 'Active' | 'Rejected';
export type ServiceStatus = 'Pending' | 'Quoted' | 'Approved' | 'Scheduled' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Unpaid' | 'Paid';
export type ServiceCategory = string; // E.g., 'Plumbing', 'Electrical', 'Cleaning'

export interface Address {
  street: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface User {
  id: number;
  auth_id: string; // From Supabase Auth
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar_url: string;
  specialties?: ServiceCategory[];
  address?: Address;
  phone?: string;
}

export interface ServiceRequest {
  id: number;
  client_id: number;
  professional_id: number | null;
  client_auth_id?: string; // UUID from Supabase Auth
  professional_auth_id?: string | null; // UUID from Supabase Auth
  title: string;
  description: string;
  category: ServiceCategory;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  status: ServiceStatus;
  payment_status: PaymentStatus;
  requested_date: string; // ISO string
  scheduled_date: string | null; // ISO string
  cost: number | null;
  client_name?: string; // Denormalized for convenience
  professional_name?: string; // Denormalized for convenience
}

export interface ChatMessage {
  id: number;
  request_id: number;
  sender_id: number;
  sender_auth_id?: string; // UUID from Supabase Auth
  text: string;
  timestamp: string; // ISO string
  sender_name?: string; // Denormalized
  sender_avatar_url?: string; // Denormalized
}

export interface Notification {
  id: number;
  message: string;
  timestamp: Date;
  read: boolean;
}