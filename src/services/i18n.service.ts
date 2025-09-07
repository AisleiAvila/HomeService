import { Injectable, signal } from "@angular/core";

export type Language = "en" | "pt";

const allTranslations: Record<Language, Record<string, string>> = {
  en: {
    // General
    signIn: "Sign In",
    createAccount: "Create Account",
    email: "Email Address",
    password: "Password",
    name: "Full Name",
    role: "Role",
    client: "Client",
    professional: "Professional",
    register: "Register",
    login: "Login",
    logout: "Logout",
    dashboard: "Dashboard",
    schedule: "Schedule",
    search: "Search",
    profile: "Profile",
    admin: "Admin",
    language: "Language",
    english: "English",
    portuguese: "Português",
    currency: "USD",
    unassigned: "Unassigned",
    unknownClient: "Unknown Client",
    noChangesDetected: "No changes detected.",
    errorInvalidFileFormat: "Invalid file format. Please use JPG, PNG, or GIF.",
    errorImageTooLarge: "Image is too large. Maximum size is 2MB.",
    errorCameraNotSupported: "Camera access is not supported by your browser.",
    errorAccessingCamera: "Error accessing camera.",
    pushNotificationsBlocked:
      "Push notifications are blocked. Please enable them in your browser settings.",
    noDataToExport: "No financial data to export.",
    reportExported: "Financial report exported successfully.",
    confirmRejectRegistration:
      "Are you sure you want to reject this registration?",
    confirmDeleteCategory:
      'Are you sure you want to delete the category "{category}"?',
    backToHome: "Back to Home",
    forgotPassword: "Forgot your password?",
    dontHaveAccount: "Don't have an account?",
    or: "or",
    cancel: "Cancel",
    paid: "Paid",

    // Landing Page
    landingDescription:
      "Your one-stop solution for reliable and professional home services. Connect with trusted experts for any job, big or small.",

    // Login / Register
    registerTitle: "Create a new account",
    registerLoginLink: "sign in to your existing account",
    iAmA: "I am a",

    // Verification
    accountVerification: "Account Verification",
    verificationCodeSentTo: "A verification code has been sent to",
    verificationCode: "Verification Code",
    verify: "Verify",
    resendCode: "Didn't receive a code? Resend",

    // Dashboard
    welcomeBack: "Welcome back, {name}!",
    dashboardSummary: "Here is a summary of your activity.",
    pendingApproval: "Pending",
    activeRequests: "Active",
    completed: "Completed",
    activeJobs: "Active Jobs",
    completedJobs: "Completed Jobs",
    totalEarnings: "Total Earnings",

    // Service List
    noServiceRequestsFound: "No service requests found.",
    quote: "Quote",
    approve: "Approve",
    reject: "Reject",
    payNow: "Pay Now",
    details: "Details",
    chat: "Chat",
    serviceRequestDetails: "Service Request Details",
    basicInformation: "Basic Information",
    title: "Title",
    category: "Category",
    status: "Status",
    requestDate: "Request Date",
    description: "Description",
    serviceAddress: "Service Address",
    costAndPayment: "Cost and Payment",
    cost: "Cost",
    paymentStatus: "Payment Status",
    assignedProfessional: "Assigned Professional",
    professionalId: "Professional ID",
    scheduledDate: "Scheduled Date",
    requestId: "Request ID",
    close: "Close",

    // Scheduler
    scheduleAppointmentFor: "Schedule Appointment for",
    selectProfessional: "Select a Professional",
    selectAProfessional: "Select a professional...",
    selectDate: "Select Date",
    selectTime: "Select Time",
    confirmSchedule: "Confirm Schedule",

    // Notifications
    notifications: "Notifications",
    noNewNotifications: "You have no new notifications.",
    markAllAsRead: "Mark all as read",
    clearAll: "Clear All",

    // Admin
    totalRevenue: "Total Revenue",
    pendingApprovals: "Pending Approvals",
    activeServices: "Active Services",
    totalProfessionals: "Total Professionals",
    csvId: "ID",
    csvClient: "Client",
    csvProfessional: "Professional",
    csvService: "Service",
    csvCompletionDate: "Completion Date",
    csvPaymentStatus: "Payment Status",
    csvBaseValue: "Base Value",
    csvTax: "Tax (7%)",
    csvTotalValue: "Total Value",
  },
  pt: {
    // General
    signIn: "Entrar",
    createAccount: "Criar Conta",
    email: "Endereço de E-mail",
    password: "Senha",
    name: "Nome Completo",
    role: "Função",
    client: "Cliente",
    professional: "Profissional",
    register: "Registrar",
    login: "Entrar",
    logout: "Sair",
    dashboard: "Painel",
    schedule: "Agenda",
    search: "Buscar",
    profile: "Perfil",
    admin: "Admin",
    language: "Idioma",
    english: "English",
    portuguese: "Português",
    currency: "BRL",
    unassigned: "Não atribuído",
    unknownClient: "Cliente desconhecido",
    noChangesDetected: "Nenhuma alteração detectada.",
    errorInvalidFileFormat: "Formato de arquivo inválido. Use JPG, PNG ou GIF.",
    errorImageTooLarge: "A imagem é muito grande. O tamanho máximo é 2MB.",
    errorCameraNotSupported:
      "O acesso à câmera não é suportado pelo seu navegador.",
    errorAccessingCamera: "Erro ao acessar a câmera.",
    pushNotificationsBlocked:
      "As notificações push estão bloqueadas. Por favor, habilite-as nas configurações do seu navegador.",
    noDataToExport: "Nenhum dado financeiro para exportar.",
    reportExported: "Relatório financeiro exportado com sucesso.",
    confirmRejectRegistration:
      "Tem certeza de que deseja rejeitar este registro?",
    confirmDeleteCategory:
      'Tem certeza de que deseja excluir a categoria "{category}"?',
    backToHome: "Voltar para Início",
    forgotPassword: "Esqueceu sua senha?",
    dontHaveAccount: "Não tem uma conta?",
    or: "ou",
    cancel: "Cancelar",
    paid: "Pago",

    // Landing Page
    landingDescription:
      "Sua solução completa para serviços domésticos confiáveis e profissionais. Conecte-se com especialistas de confiança para qualquer trabalho, grande ou pequeno.",

    // Login / Register
    registerTitle: "Crie uma nova conta",
    registerLoginLink: "faça login na sua conta existente",
    iAmA: "Eu sou um(a)",

    // Verification
    accountVerification: "Verificação de Conta",
    verificationCodeSentTo: "Um código de verificação foi enviado para",
    verificationCode: "Código de Verificação",
    verify: "Verificar",
    resendCode: "Não recebeu o código? Reenviar",

    // Dashboard
    welcomeBack: "Bem-vindo(a) de volta, {name}!",
    dashboardSummary: "Aqui está um resumo da sua atividade.",
    pendingApproval: "Pendentes",
    activeRequests: "Ativas",
    completed: "Concluídas",
    activeJobs: "Trabalhos Ativos",
    completedJobs: "Trabalhos Concluídos",
    totalEarnings: "Ganhos Totais",

    // Service List
    noServiceRequestsFound: "Nenhuma solicitação de serviço encontrada.",
    quote: "Orçamento",
    approve: "Aprovar",
    reject: "Rejeitar",
    payNow: "Pagar Agora",
    details: "Detalhes",
    chat: "Chat",
    serviceRequestDetails: "Detalhes da Solicitação de Serviço",
    basicInformation: "Informações Básicas",
    title: "Título",
    category: "Categoria",
    status: "Status",
    requestDate: "Data da Solicitação",
    description: "Descrição",
    serviceAddress: "Endereço do Serviço",
    costAndPayment: "Custo e Pagamento",
    cost: "Custo",
    paymentStatus: "Status do Pagamento",
    assignedProfessional: "Profissional Designado",
    professionalId: "ID do Profissional",
    scheduledDate: "Data Agendada",
    requestId: "ID da Solicitação",
    close: "Fechar",

    // Scheduler
    scheduleAppointmentFor: "Agendar para",
    selectProfessional: "Selecionar Profissional",
    selectAProfessional: "Selecione um profissional...",
    selectDate: "Selecionar Data",
    selectTime: "Selecionar Hora",
    confirmSchedule: "Confirmar Agendamento",

    // Notifications
    notifications: "Notificações",
    noNewNotifications: "Você não tem novas notificações.",
    markAllAsRead: "Marcar todas como lidas",
    clearAll: "Limpar todas",

    // Admin
    totalRevenue: "Receita Total",
    pendingApprovals: "Aprovações Pendentes",
    activeServices: "Serviços Ativos",
    totalProfessionals: "Total de Profissionais",
    csvId: "ID",
    csvClient: "Cliente",
    csvProfessional: "Profissional",
    csvService: "Serviço",
    csvCompletionDate: "Data de Conclusão",
    csvPaymentStatus: "Status do Pagamento",
    csvBaseValue: "Valor Base",
    csvTax: "Imposto (7%)",
    csvTotalValue: "Valor Total",
  },
};

@Injectable({
  providedIn: "root",
})
export class I18nService {
  readonly language = signal<Language>("en");

  setLanguage(lang: Language) {
    this.language.set(lang);
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const lang = this.language();
    let translation = allTranslations[lang][key] || key;
    if (params) {
      Object.keys(params).forEach((paramKey) => {
        translation = translation.replace(
          `{${paramKey}}`,
          String(params[paramKey])
        );
      });
    }
    return translation;
  }
}
