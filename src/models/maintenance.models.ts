export type UserRole = "client" | "professional" | "admin";
export type UserStatus = "Pending" | "Active" | "Rejected";
export type ServiceStatus =
  | "Solicitado"
  | "Em análise"
  | "Aguardando esclarecimentos"
  | "Orçamento enviado"
  | "Aguardando aprovação do orçamento"
  | "Orçamento aprovado"
  | "Orçamento rejeitado"
  | "Buscando profissional"
  | "Profissional selecionado"
  | "Aguardando confirmação do profissional"
  | "Agendado"
  | "Em execução"
  | "Concluído - Aguardando aprovação"
  | "Aprovado pelo cliente"
  | "Rejeitado pelo cliente"
  | "Pago"
  | "Finalizado"
  | "Cancelado";
export type PaymentStatus =
  | "Unpaid"
  | "Paid"
  | "Pending"
  | "Processing"
  | "Released"
  | "Disputed";
export type ServiceCategory = string; // E.g., 'Plumbing', 'Electrical', 'Cleaning'

// Novos tipos para o fluxo de trabalho expandido
export type NotificationType =
  | "quote_request"
  | "quote_sent"
  | "quote_approved"
  | "quote_rejected"
  | "professional_assigned"
  | "professional_accepted"
  | "professional_rejected"
  | "work_scheduled"
  | "work_started"
  | "work_completed"
  | "payment_due"
  | "payment_completed"
  | "evaluation_pending"
  | "clarification_requested"
  | "clarification_provided"
  | "deadline_warning"
  | "overdue_alert"
  | "general";

export type ProfessionalResponse = "accepted" | "rejected" | null;
export type ClientApproval = "approved" | "rejected" | null;

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

  // Campos existentes para controle de agendamento e tempo
  requested_datetime?: string; // Data e hora solicitada pelo cliente (ISO string)
  scheduled_start_datetime?: string | null; // Data e hora agendada pelo administrador (ISO string)
  estimated_duration_minutes?: number | null; // Previsão de duração em minutos (administrador)
  actual_start_datetime?: string | null; // Data e hora real de início (profissional)
  actual_end_datetime?: string | null; // Data e hora real do final (profissional)

  // NOVOS CAMPOS PARA O FLUXO EXPANDIDO

  // FASE 1: ORÇAMENTO
  quote_amount?: number | null; // Valor do orçamento
  quote_description?: string | null; // Descrição detalhada do orçamento
  quote_sent_at?: string | null; // Data envio orçamento
  quote_approved_at?: string | null; // Data aprovação cliente
  client_clarifications?: string | null; // Esclarecimentos do cliente
  admin_requests?: string | null; // Solicitações do admin

  // FASE 2: SELEÇÃO E AGENDAMENTO
  selected_professional_id?: number | null; // Profissional selecionado
  professional_response?: ProfessionalResponse; // Resposta do profissional
  professional_response_at?: string | null; // Data resposta profissional
  contract_generated_at?: string | null; // Data geração contrato
  contract_url?: string | null; // URL do contrato digital

  // FASE 3: EXECUÇÃO
  work_started_at?: string | null; // Data/hora início real
  work_completed_at?: string | null; // Data/hora conclusão real
  progress_updates?: string[] | null; // Atualizações de progresso

  // FASE 4: APROVAÇÃO E PAGAMENTO
  client_approval?: ClientApproval; // Aprovação do cliente
  client_approval_at?: string | null; // Data aprovação cliente
  client_feedback?: string | null; // Feedback do cliente sobre trabalho
  payment_due_date?: string | null; // Data limite pagamento
  payment_completed_at?: string | null; // Data pagamento efetivo
  platform_fee?: number | null; // Taxa da plataforma
  professional_payment?: number | null; // Valor pago ao profissional

  // AVALIAÇÕES
  client_rating?: number | null; // Nota do cliente (1-5)
  professional_rating?: number | null; // Nota do profissional (1-5)
  mutual_evaluation_completed?: boolean; // Avaliações mútuas completas

  // CONTESTAÇÕES E REVISÕES
  revision_requested?: boolean; // Cliente solicitou revisão
  revision_reason?: string | null; // Motivo da revisão
  dispute_opened?: boolean; // Contestação aberta
  dispute_resolution?: string | null; // Resolução da contestação

  // HISTÓRICO E COMUNICAÇÃO
  status_history?: Array<{
    // Histórico de mudanças de status
    status: ServiceStatus;
    changed_at: string;
    changed_by: number;
    notes?: string;
  }> | null;

  // ALERTAS E PRAZOS
  deadline_alerts_sent?: string[] | null; // Alertas de prazo enviados
  overdue?: boolean; // Pedido em atraso

  // Timestamps
  created_at?: string;
  updated_at?: string;
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

// Notificação aprimorada para o novo fluxo
export interface EnhancedNotification extends Notification {
  type: NotificationType;
  title: string;
  service_request_id?: number;
  action_required?: boolean;
  priority: "low" | "medium" | "high";
  user_id: number;
  expires_at?: Date;
  created_at?: string; // ISO string from database
}

// Interface para contratos
export interface Contract {
  id: number;
  service_request_id: number;
  contract_data: any;
  generated_at: string;
  signed_by_client_at?: string | null;
  signed_by_professional_at?: string | null;
  contract_url?: string | null;
}

// Interface para pagamentos
export interface Payment {
  id: number;
  service_request_id: number;
  amount: number;
  platform_fee: number;
  professional_amount: number;
  payment_method?: string;
  processed_at: string;
  released_at?: string | null;
  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "disputed"
    | "refunded";
}

// Interface para avaliações
export interface Evaluation {
  id: number;
  service_request_id: number;
  evaluator_id: number;
  evaluated_id: number;
  rating: number; // 1-5
  feedback?: string;
  created_at: string;
}

// Interface para disputas
export interface Dispute {
  id: number;
  service_request_id: number;
  opened_by: number;
  reason: string;
  status: "open" | "investigating" | "resolved" | "closed";
  resolution?: string;
  resolved_by?: number;
  opened_at: string;
  resolved_at?: string | null;
}

// Interface para esclarecimentos (dúvidas e respostas)
export interface ServiceClarification {
  id: number;
  service_request_id: number;
  user_id: number; // Quem fez a pergunta ou resposta
  parent_id?: number | null; // ID do esclarecimento pai (para respostas)
  type: "question" | "answer"; // Tipo: pergunta ou resposta
  title: string; // Título da dúvida/resposta
  content: string; // Conteúdo da dúvida/resposta
  is_read: boolean; // Se foi lida pelo destinatário
  created_at: string; // Data de criação
  updated_at?: string; // Data de atualização
  user_name?: string; // Nome do usuário (denormalizado)
  user_role?: UserRole; // Papel do usuário (denormalizado)
}

// Interface para estatísticas de workflow
export interface WorkflowStats {
  total_requests: number;
  by_status: Record<ServiceStatus, number>;
  average_completion_time: number;
  pending_actions: number;
  overdue_requests: number;
}

// FIX: Added ServiceRequestPayload to models to avoid circular dependencies.
export interface ServiceRequestPayload {
  title: string;
  description: string;
  category: ServiceCategory;
  address: Address;
  requested_datetime: string; // Data e hora solicitada pelo cliente (ISO string) - OBRIGATÓRIO
}
