// Interface para Serviços Extras (extra_service_items)
export interface ExtraService {
  id: number;
  service_request_id: number;
  professional_id: number;
  description: string;
  value: number;
  created_at: string;
  has_reimbursement: boolean;
  reimbursement_value: number | null;
  reimbursement_date: string | null;
}
// Origem da solicitação de serviço
export interface ServiceRequestOrigin {
  id: number;
  name: string;
}


// Armazém
export interface Warehouse {
  id: number;
  name: string;
  location?: string | null;
  created_at?: string;
}

export type StockItemStatus =
  | "Recebido"
  | "Distribuído"
  | "Retirado"
  | "Instalado"
  | "Devolvido";

// Estoque (materiais recebidos)
export interface StockItem {
  id: number;
  barcode: string;
  product_name?: string | null;
  quantity: number;
  supplier: string;
  received_at: string;
  status: StockItemStatus;
  service_request_id?: number | null;
  service_request?: {
    id: number;
    title: string;
  } | null;
  notes?: string | null;
  created_by_admin_id?: number | null;
  created_at?: string;
  warehouse_id?: number | null;
  warehouse?: Warehouse | null;
  created_by_admin?: {
    name: string;
  } | null;
}

// Materiais associados a uma solicitação (service_request_materials)
export interface ServiceRequestMaterial {
  id: number;
  service_request_id: number;
  stock_item_id: number;
  quantity_used: number;
  notes?: string | null;
  created_by_admin_id?: number | null;
  created_at?: string;

  // JOIN opcional
  stock_item?: StockItem | null;
}
export type UserRole =
  | "client"
  | "professional"
  | "admin"
  | "almoxarife"
  | "secretario"
  | "professional_almoxarife";
export type UserStatus = "Pending" | "Active" | "Rejected" | "Inactive";

// Sistema simplificado: 9 status (removido fluxo de orçamentos e aprovação de cliente)
export type ServiceStatus =
  | "Solicitado"                    // Admin criou a solicitação
  | "Atribuído"                     // Admin atribuiu a um profissional
  | "Aguardando Confirmação"        // Profissional foi notificado
  | "Aceito"                        // Profissional aceitou
  | "Recusado"                      // Profissional recusou
  | "Data Definida"                 // Profissional definiu data
  | "Em Progresso"                  // Serviço em execução
  | "Concluído"                     // Execução concluída (aguardando baixa/encerramento administrativo)
  | "Finalizado"                    // Encerramento administrativo após baixa na Origem
  | "Cancelado"                     // Cancelado
  | "In Progress";                  // Sinônimo para "Em Progresso"

export type PaymentStatus =
  | "Unpaid"
  | "Paid"
  | "Pending"
  | "Processing"
  | "Released"
  | "Disputed";
export interface ServiceCategory {
  id: number;
  name: string;
  subcategories?: ServiceSubcategory[];
}

// Subcategoria de serviço
export interface ServiceSubcategory {
  id: number;
  name: string;
  category_id: number; // FK para ServiceCategory
  description?: string | null;
}

// Extended subcategory fields for pricing/quoting and description
export interface ServiceSubcategoryExtended extends ServiceSubcategory {
  // 'precificado' = priced (has fixed price & avg time), 'orçado' = quoted
  type?: "precificado" | "orçado";
  average_time_minutes?: number | null;
  price?: number | null;
}

// Novos tipos para o fluxo de trabalho expandido
export type NotificationType =
  | "quote_request"
  | "quote_sent"
  | "quote_approved"
  | "quote_rejected"
  | "execution_date_proposal"
  | "execution_date_approved"
  | "execution_date_rejected"
  | "service_assigned"
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
export type DateApproval = "approved" | "rejected" | null;

// Interface para respostas de profissionais
export interface ProfessionalQuoteResponse {
  professional_id: number;
  professional_name: string;
  quote_amount: number | null;
  quote_notes?: string | null;
  estimated_duration_hours?: number | null;
  response_status: 'pending' | 'responded' | 'accepted' | 'rejected';
  responded_at?: string | null;
  professional_avatar_url?: string;
  professional_rating?: number;
}

// Novos tipos para controle de agendamento
export type SchedulingStatus =
  | "Awaiting Schedule"
  | "Scheduled"
  | "Scheduled Today"
  | "Delayed"
  | "In Progress"
  | "Concluído"
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
  street_number?: string; // Número do logradouro
  complement?: string; // Complemento (apto, bloco, etc)
  city: string; // Localidade (ex: Lisboa, Porto)
  state: string; // Distrito (ex: Lisboa, Porto, Coimbra)
  zip_code: string; // Código Postal (formato: XXXX-XXX)
  freguesia?: string; // Freguesia (opcional para Portugal)
  concelho?: string; // Concelho (opcional para Portugal)
}

export interface User {
  id: number;
  tenant_id?: string | null;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar_url: string;
  created_at?: string; // Data de criação do usuário (ISO)
  email_verified?: boolean; // Campo para verificação de email
  specialties?: ServiceCategory[];
  address?: Address;
  phone?: string; // Número de telefone do usuário
  phone_verified?: boolean; // Indica se o telefone foi validado
  sms_code?: string; // Código SMS para verificação
  sms_code_expires_at?: string; // Data/hora de expiração do código SMS (ISO)
  receive_sms_notifications?: boolean;
  reset_token?: string | null; // Token para reset de senha
  reset_token_expiry?: string | null; // Data/hora de expiração do token de reset (ISO)
  is_natan_employee?: boolean; // Indica se o profissional é funcionário da Natan Construtora (true) ou prestador independente (false)
}

export interface ServiceRequest {
  id: number;
  tenant_id?: string | null;
  
  // DADOS DO CLIENTE (informativo, não mais FK para users)
  client_id: number | null; // DEPRECATED - manter por compatibilidade
  client_name?: string; // Nome do cliente (obrigatório no novo sistema)
  email_client?: string; // Email do cliente (obrigatório no novo sistema)
  client_phone?: string; // Telefone do cliente (obrigatório no novo sistema)
  client_nif?: string; // NIF do cliente (opcional)
  client_address?: string; // Endereço completo do cliente

  // Origem da solicitação
  origin_id?: number; // FK para service_request_origins
  origin?: ServiceRequestOrigin; // Objeto populado via JOIN
  
  // Ordem de Serviço (OS)
  os?: string | null; // Número da ordem de serviço (campo numérico não obrigatório)
  
  // DADOS DO PROFISSIONAL
  professional_id: number | null;
  professional_name?: string; // Denormalized for convenience
  professional_avatar_url?: string; // Avatar URL do profissional
  
  // DADOS ADMINISTRATIVOS (novos campos)
  created_by_admin_id?: number; // FK para users (admin que criou)
  assigned_by_admin_id?: number; // FK para users (admin que atribuiu)
  paid_by_admin_id?: number; // FK para users (admin que registrou pagamento)
  finalized_by_admin_id?: number; // FK para users (admin que finalizou)
  
  // DADOS DO SERVIÇO
  title: string;
  description: string;
  category_id: number; // FK para service_categories
  category?: ServiceCategory; // Objeto populado via JOIN
  subcategory_id?: number; // FK para service_subcategories
  subcategory?: ServiceSubcategory; // Objeto populado via JOIN
  
  // ENDEREÇO DO SERVIÇO
  street: string;
  street_manual?: string | null; // Logradouro manual (quando não há no código postal)
  street_number?: string; // Número do logradouro
  complement?: string; // Complemento (apto, bloco, etc)
  city: string;
  state: string;
  zip_code: string;

  /**
   * IANA timezone of the service location, derived from zip_code.
   * Examples: "Europe/Lisbon", "Atlantic/Azores".
   */
  service_time_zone?: string | null;
  
  // GEOLOCALIZAÇÃO
  latitude?: number | null;
  longitude?: number | null;
  
  // STATUS E PAGAMENTO
  status: ServiceStatus;
  payment_status: PaymentStatus;
  
  // DATAS (campos legados - manter por compatibilidade)
  requested_date: string; // ISO string - DEPRECATED: use requested_datetime
  scheduled_date: string | null; // ISO string - DEPRECATED: use scheduled_start_datetime
  
  // VALORES DO SERVIÇO
  valor: number; // Valor total do serviço
  valor_prestador: number; // Valor da prestação de serviço

  // PRIORIDADE
  priority?: 'Normal' | 'Urgent'; // Prioridade da solicitação

  // Campos existentes para controle de agendamento e tempo
  requested_datetime?: string; // Data e hora solicitada (ISO string)
  scheduled_start_datetime?: string | null; // Data e hora agendada pelo profissional (ISO string)
  estimated_duration_minutes?: number | null; // Previsão de duração em minutos
  actual_start_datetime?: string | null; // Data e hora real de início (profissional)
  actual_end_datetime?: string | null; // Data e hora real do final (profissional)
  
  // NOVOS CAMPOS DE PAGAMENTO ADMINISTRATIVO
  payment_date?: string | null; // Data do pagamento ao profissional
  payment_amount?: number | null; // Valor pago ao profissional
  payment_method?: 'Dinheiro' | 'Transferência' | 'PIX' | 'Cheque' | null; // Método de pagamento
  payment_notes?: string | null; // Observações sobre o pagamento
  
  // TIMESTAMPS DE CONTROLE
  started_at?: string | null; // Data/hora de início da execução
  completed_at?: string | null; // Data/hora de conclusão pelo profissional
  finalized_at?: string | null; // Data/hora de finalização pelo admin
  admin_notes?: string | null; // Notas administrativas internas

  // Relatório Técnico
  // Sinaliza se já existe ao menos um relatório técnico salvo para esta solicitação.
  // (Usado para ocultar a ação "Relatório Técnico" na visão geral.)
  has_technical_report?: boolean;

  // =========================================================================
  // CAMPOS REMOVIDOS: sistema antigo de orçamentos
  // =========================================================================
  // (quote_amount, quote_description, quote_sent_at, quote_approved_at, clarifications, admin_requests) REMOVIDOS

  // FASE 2: SELEÇÃO E AGENDAMENTO
  selected_professional_id?: number | null; // Profissional selecionado
  professional_response?: ProfessionalResponse; // Resposta do profissional
  professional_response_at?: string | null; // Data resposta profissional
  contract_generated_at?: string | null; // Data geração contrato
  contract_url?: string | null; // URL do contrato digital

  // NOVOS CAMPOS PARA APROVAÇÃO DE DATA DE EXECUÇÃO
  proposed_execution_date?: string | null; // Data proposta pelo administrador (ISO string)
  proposed_execution_notes?: string | null; // Observações sobre a data proposta
  execution_date_proposed_at?: string | null; // Timestamp da proposta de data
  execution_date_approval?: DateApproval; // Aprovação da data
  execution_date_approved_at?: string | null; // Timestamp da aprovação da data
  execution_date_rejection_reason?: string | null; // Motivo da rejeição da data

  // FASE 3: EXECUÇÃO
  work_started_at?: string | null; // Data/hora início real
  work_completed_at?: string | null; // Data/hora conclusão real
  progress_updates?: string[] | null; // Atualizações de progresso

  // FASE 4: APROVAÇÃO E PAGAMENTO
  approval_at?: string | null; // Data aprovação
  feedback?: string | null; // Feedback sobre trabalho
  payment_due_date?: string | null; // Data limite pagamento
  payment_completed_at?: string | null; // Data pagamento efetivo
  platform_fee?: number | null; // Taxa da plataforma
  professional_payment?: number | null; // Valor pago ao profissional

  // AVALIAÇÕES
  rating?: number | null; // Nota (1-5)
  professional_rating?: number | null; // Nota do profissional (1-5)
  mutual_evaluation_completed?: boolean; // Avaliações mútuas completas

  // CONTESTAÇÕES E REVISÕES
  revision_requested?: boolean; // Revisão solicitada
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

  // Dados do Solicitante (Cliente Externo)
  requester_name?: string | null;
  requester_nif?: string | null;
  requester_email?: string | null;
  requester_phone?: string | null;
  requester_contact_consent?: boolean;

  // Anexos e Mídia
  photos?: string[] | null; // URLs de fotos anexadas
  attachments?: string[] | null; // URLs de documentos anexados

  // Detalhes da Localização do Serviço
  address_floor?: string | null; // Ex: "3º Esquerdo"
  location_access_notes?: string | null; // Ex: "Escadas", "Elevador"
  location_parking?: string | null; // Ex: "Estacionamento disponível"
  location_access_hours?: string | null; // Ex: "Só após as 18h"

  // Disponibilidade e Urgência
  alternative_availability?: string | null; // Ex: "Qualquer dia útil entre as 9h e 13h"
  urgency?: 'Normal' | 'Urgente' | 'Agendado' | null;

  // Timestamps
  created_at?: string;
  updated_at?: string;

  /** Exclusão lógica (quando não-nulo, a solicitação está apagada) */
  deleted_at?: string | null;

  // Campos para solicitação criada pelo administrador
  service_value?: number | null;
  service_deadline?: string | null;
  created_by_admin?: boolean;

  // Respostas de profissionais
  professional_responses?: ProfessionalQuoteResponse[] | null;
  /** Indica se o serviço foi pago ao profissional */
  ispaid: boolean;
}

export interface ChatMessage {
  id: number;
  request_id: number;
  sender_id: number;
  text: string;
  timestamp: string; // ISO string
  sender_name?: string; // Denormalized
  sender_avatar_url?: string; // Denormalized
}

export interface Notification {
  id: number;
  message: string;
  created_at: Date;
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
  dedupe_date?: string;
}

// Interface para contratos
export interface Contract {
  id: number;
  service_request_id: number;
  contract_data: any;
  generated_at: string;
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
  category_id: number;
  subcategory_id: number; // Agora obrigatório
  origin_id?: number;
  os?: string | null; // Ordem de Serviço (opcional, numérico)
  address: Address;
  requested_datetime: string; // Data e hora solicitada (ISO string) - OBRIGATÓRIO
  priority?: 'Normal' | 'Urgent'; // Prioridade da solicitação
  valor: number;
  valor_prestador: number;
  latitude?: number | null;
  longitude?: number | null;
  street_manual?: string | null; // Logradouro informado manualmente quando não disponível no código postal
  // Dados do solicitante (coletados no formulário)
  client_name?: string;
  client_phone?: string;
  client_nif?: string | null;
  email_client?: string;
}

export type Urgency = "low" | "medium" | "high" | "critical";

// Interface para representar um distrito
export interface Distrito {
  id: number;
  nome: string;
  codigo_postal: string;
  regiao: string;
  populacao: number;
  area_km2: number;
  densidade_populacional: number;
  created_at: string;
  updated_at: string;
}

// Interface para representar um concelho
export interface Conselho {
  id: number;
  nome: string;
  distrito_id: number;
  populacao: number;
  area_km2: number;
  densidade_populacional: number;
  created_at: string;
  updated_at: string;
}

// Interface para representar uma freguesia
export interface Freguesia {
  id: number;
  nome: string;
  conselho_id: number;
  populacao: number;
  area_km2: number;
  densidade_populacional: number;
  created_at: string;
  updated_at: string;
}

// Interface para representar um utilizador (user) com morada completa
export interface UtilizadorComMorada {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  morada: {
    id: number;
    rua: string;
    codigo_postal: string;
    localidade: string;
    distrito: string;
    concelho: string;
    freguesia: string;
  };
}

// Interface para representar um pedido de serviço com detalhes completos
export interface PedidoServicoCompleto {
  id: number;
  titulo: string;
  descricao: string;
  categoria: ServiceCategory;
  subcategoria: ServiceSubcategory;
  cliente: UtilizadorComMorada;
  profissional?: UtilizadorComMorada;
  status: ServiceStatus;
  data_solicitacao: string;
  data_agendada?: string;
  data_execucao?: string;
  valor?: number;
  pagamento_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

// Interface para representar um orçamento
export interface Orcamento {
  id: number;
  pedido_servico_id: number;
  valor: number;
  descricao?: string;
  enviado_em: string;
  aprovado_em?: string;
  rejeitado_em?: string;
  status: "pendente" | "aprovado" | "rejeitado";
  created_at: string;
  updated_at: string;
}

// Interface para representar um contrato
export interface Contract {
  id: number;
  pedido_servico_id: number;
  data_contrato: string;
  valor_total: number;
  profissional_id: number;
  cliente_id: number;
  status: "ativo" | "concluido" | "cancelado";
  created_at: string;
  updated_at: string;
}

// Interface para representar um pagamento
export interface Payment {
  id: number;
  pedido_servico_id: number;
  valor: number;
  taxa_plataforma: number;
  valor_profissional: number;
  metodo_pagamento?: string;
  processado_em: string;
  liberado_em?: string | null;
  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "disputed"
    | "refunded";
}

// Interface para representar uma avaliação
export interface Avaliacao {
  id: number;
  pedido_servico_id: number;
  avaliador_id: number;
  avaliado_id: number;
  nota: number; // 1-5
  feedback?: string;
  created_at: string;
}

// Interface para representar uma disputa
export interface Disputa {
  id: number;
  pedido_servico_id: number;
  aberta_por: number;
  motivo: string;
  status: "open" | "investigating" | "resolved" | "closed";
  resolucao?: string;
  resolvido_por?: number;
  aberta_em: string;
  resolvida_em?: string | null;
}

// Interface para representar um esclarecimento (dúvida ou resposta)
export interface Esclarecimento {
  id: number;
  pedido_servico_id: number;
  usuario_id: number; // Quem fez a pergunta ou resposta
  parent_id?: number | null; // ID do esclarecimento pai (para respostas)
  tipo: "question" | "answer"; // Tipo: pergunta ou resposta
  titulo: string; // Título da dúvida/resposta
  conteudo: string; // Conteúdo da dúvida/resposta
  lido: boolean; // Se foi lida pelo destinatário
  created_at: string; // Data de criação
  updated_at?: string; // Data de atualização
  usuario_nome?: string; // Nome do usuário (denormalizado)
  usuario_papel?: UserRole; // Papel do usuário (denormalizado)
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
  category_id: number;
  subcategory_id: number; // Agora obrigatório
  address: Address;
  requested_datetime: string; // Data e hora solicitada (ISO string) - OBRIGATÓRIO
}

// ====================================
// SMS TYPES
// ====================================

/**
 * Tipos de template para SMS
 */
export type SmsTemplateType = 'verification' | 'notification' | 'reminder' | 'custom';

/**
 * Status de envio de SMS
 */
export type SmsStatus = 'sent' | 'delivered' | 'failed' | 'pending';

/**
 * Parâmetros para envio de SMS
 */
export interface SmsParams {
  to: string; // Número de telefone no formato internacional (+351...)
  message: string; // Mensagem a ser enviada
  template?: SmsTemplateType; // Template predefinido
  variables?: Record<string, string>; // Variáveis para substituição no template
}

/**
 * Resposta do envio de SMS
 */
export interface SmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp?: string;
  status?: string;
  segments?: number;
}

/**
 * Histórico de SMS enviado
 */
export interface SmsHistory {
  id: string;
  to: string;
  message: string;
  status: SmsStatus;
  sent_at: Date;
  delivered_at?: Date;
  error?: string;
}

/**
 * Configuração de notificações SMS para usuário
 */
export interface SmsNotificationPreferences {
  receive_sms_notifications: boolean;
  notify_on_status_change: boolean;
  notify_on_assignment: boolean;
  notify_on_schedule: boolean;
  notify_on_payment: boolean;
}

// Interface para código postal português
export interface CodigoPostal {
  codigo_postal_completo: string;
  num_cod_postal: string;
  ext_cod_postal: string;
  nome_localidade: string;
  cod_distrito: string;
  cod_concelho: string;
  desig_postal: string;
  nome_arteria?: string;
  tipo_arteria?: string;
  prep1?: string;
  titulo_arteria?: string;
  local_arteria?: string;
  latitude?: number | null;
  longitude?: number | null;
}

// Interface para endereço completo retornado pelo serviço
export interface EnderecoCompleto {
  codigo_postal: string;
  localidade: string;
  concelho: string;
  distrito: string;
  designacao_postal: string;
  arteria?: string;
  latitude?: number | null;
  longitude?: number | null;
}

// Interface para imagens de solicitações de serviço
export interface ServiceRequestImage {
  id: number;
  service_request_id: number;
  uploaded_by: number;
  image_url: string;
  image_type: 'before' | 'after';
  description?: string | null;
  uploaded_at: string;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
}

// Interface para dados de upload de imagem
export interface ServiceRequestImageUpload {
  service_request_id: number;
  image_type: 'before' | 'after';
  description?: string;
}

// Interface para relatórios técnicos gerados
export type TechnicalReportOriginKey = "worten_verde" | "worten_azul" | "radio_popular";

export interface TechnicalReportRecord {
  id: number;
  service_request_id: number;
  origin_id?: number | null;
  origin_key: TechnicalReportOriginKey;
  report_data: Record<string, any>;
  generated_by: number;
  generated_at: string;
  storage_bucket: string;
  storage_path: string;
  file_url: string;
  file_name: string;
  file_size?: number | null;
  mime_type?: string | null;
}

// Interface para notificações in-app
export interface InAppNotification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  created_at: string;
  read_at?: string | null;
  metadata?: Record<string, any> | null;
}

// Interface para quilometragem diária
export interface DailyMileage {
  id: number;
  professional_id: number;
  date: string; // YYYY-MM-DD
  license_plate?: string | null;
  start_kilometers: number;
  end_kilometers?: number;
  created_at: string;
  updated_at: string;
}

// Interface para abastecimentos
export interface Fueling {
  id: number;
  daily_mileage_id: number;
  value: number;
  license_plate?: string | null;
  receipt_image_url?: string;
  created_at: string;
}
