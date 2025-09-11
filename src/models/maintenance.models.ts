export type UserRole = "client" | "professional" | "admin";
export type UserStatus = "Pending" | "Active" | "Rejected";
export type ServiceStatus =
  | "Pending"
  | "Quoted"
  | "Approved"
  | "Scheduled"
  | "Assigned"
  | "In Progress"
  | "Completed"
  | "Cancelled";
export type PaymentStatus = "Unpaid" | "Paid";
export type ServiceCategory = string; // E.g., 'Plumbing', 'Electrical', 'Cleaning'

// Novos tipos para controle de agendamento
export type SchedulingStatus =
  | "Awaiting Schedule"
  | "Scheduled"
  | "Scheduled Today"
  | "Delayed"
  | "In Progress"
  | "Completed"
  | "Pending";

export interface TimeControlData {
  requested_datetime?: string;
  scheduled_start_datetime?: string | null;
  estimated_duration_minutes?: number | null;
  actual_start_datetime?: string | null;
  actual_end_datetime?: string | null;
}

export interface SchedulingReport {
  id: number;
  title: string;
  category: ServiceCategory;
  status: ServiceStatus;
  client_name?: string;
  professional_name?: string;
  requested_datetime?: string;
  scheduled_start_datetime?: string | null;
  estimated_duration_minutes?: number | null;
  actual_start_datetime?: string | null;
  actual_end_datetime?: string | null;
  actual_duration_minutes?: number | null;
  scheduling_status: SchedulingStatus;
  duration_variance_minutes?: number | null;
  full_address: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  street: string; // Rua/Avenida completa
  city: string; // Localidade (ex: Lisboa, Porto)
  state: string; // Distrito (ex: Lisboa, Porto, Coimbra)
  zip_code: string; // Código Postal (formato: XXXX-XXX)
  freguesia?: string; // Freguesia (opcional para Portugal)
  concelho?: string; // Concelho (opcional para Portugal)
}

export interface User {
  id: number;
  auth_id: string; // From Supabase Auth
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar_url: string;
  email_verified?: boolean; // Campo para verificação de email
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
  requested_date: string; // ISO string - DEPRECATED: use requested_datetime
  scheduled_date: string | null; // ISO string - DEPRECATED: use scheduled_start_datetime
  cost: number | null;
  client_name?: string; // Denormalized for convenience
  professional_name?: string; // Denormalized for convenience

  // Novos campos para controle de agendamento e tempo
  requested_datetime?: string; // Data e hora solicitada pelo cliente (ISO string)
  scheduled_start_datetime?: string | null; // Data e hora agendada pelo administrador (ISO string)
  estimated_duration_minutes?: number | null; // Previsão de duração em minutos (administrador)
  actual_start_datetime?: string | null; // Data e hora real de início (profissional)
  actual_end_datetime?: string | null; // Data e hora real do final (profissional)
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

// FIX: Added ServiceRequestPayload to models to avoid circular dependencies.
export interface ServiceRequestPayload {
  title: string;
  description: string;
  category: ServiceCategory;
  address: Address;
  requested_datetime: string; // Data e hora solicitada pelo cliente (ISO string) - OBRIGATÓRIO
}
