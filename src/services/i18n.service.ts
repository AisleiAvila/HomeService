

import { Injectable, signal } from '@angular/core';

export type Language = 'en' | 'pt';

type Translations = Record<string, string>;

const translations: Record<Language, Translations> = {
  en: {
    // Auth Flow
    landingDescription: 'The easiest way to find and hire trusted professionals for any home service.',
    signIn: 'Sign In',
    createAccount: 'Create Account',
    loginTitle: 'Sign in to your account',
    loginNoAccount: 'Or',
    loginCreateAccountLink: 'create a new account',
    emailAddress: 'Email Address',
    password: 'Password',
    loginForgotPassword: 'Forgot your password?',
    cancel: 'Cancel',
    registerTitle: 'Create a new account',
    or: 'or',
    registerLoginLink: 'login to your existing account',
    fullName: 'Full Name',
    iAmA: 'I am a:',
    client: 'Client',
    professional: 'Professional',
    register: 'Register',
    accountVerification: 'Account Verification',
    verificationCodeSentTo: 'A verification code has been sent to',
    verificationCode: 'Verification Code',
    verify: 'Verify',
    resendCode: 'Resend code',

    // Main App
    dashboard: 'Dashboard',
    schedule: 'Schedule',
    search: 'Search',
    adminPanel: 'Admin Panel',
    profile: 'Profile',
    logout: 'Logout',
    newRequest: 'New Request',

    // Dashboard
    welcomeBack: 'Welcome back, {name}!',
    dashboardSummary: 'Here is a summary of your recent activity.',
    pendingApproval: 'Pending Approval',
    activeRequests: 'Active Requests',
    completed: 'Completed',
    activeJobs: 'Active Jobs',
    completedJobs: 'Completed Jobs',
    totalEarnings: 'Total Earnings',
    currency: 'USD',
    completedRequests: 'Completed Requests',
    noServiceRequestsFound: 'No service requests found.',
    quote: 'Quote',
    paid: 'Paid',
    approve: 'Approve',
    reject: 'Reject',
    // FIX: Removed duplicate 'schedule' property to prevent object literal error.
    payNow: 'Pay Now',
    details: 'Details',
    chat: 'Chat',

    // Admin
    totalRevenue: 'Total Revenue',
    pendingApprovals: 'Pending Approvals',
    activeServices: 'Active Services',
    totalProfessionals: 'Total Professionals',
    unassigned: 'Unassigned',
    unknownClient: 'Unknown Client',
    confirmRejectRegistration: 'Are you sure you want to reject this registration?',
    confirmDeleteCategory: 'Are you sure you want to delete the category "{category}"?',
    noDataToExport: 'No data to export.',
    reportExported: 'Report exported successfully.',
    csvId: 'ID',
    csvClient: 'Client',
    csvProfessional: 'Professional',
    csvService: 'Service',
    csvCompletionDate: 'Completion Date',
    csvPaymentStatus: 'Payment Status',
    csvBaseValue: 'Base Value',
    csvTax: 'Tax (7%)',
    csvTotalValue: 'Total Value',
    
    // Profile
    noChangesDetected: 'No changes were detected.',
    errorInvalidFileFormat: 'Invalid file format. Please use JPEG, PNG, or GIF.',
    errorImageTooLarge: 'Image is too large. Maximum size is 2MB.',
    errorCameraNotSupported: 'Camera access is not supported by your browser.',
    errorAccessingCamera: 'Error accessing camera. Please check permissions.',

    // Push Notifications
    pushNotificationsBlocked: 'Push notifications are blocked. Please enable them in your browser settings.',
  },
  pt: {
    // Auth Flow
    landingDescription: 'A maneira mais fácil de encontrar e contratar profissionais de confiança para qualquer serviço doméstico.',
    signIn: 'Entrar',
    createAccount: 'Criar Conta',
    loginTitle: 'Faça login em sua conta',
    loginNoAccount: 'Ou',
    loginCreateAccountLink: 'crie uma nova conta',
    emailAddress: 'Endereço de E-mail',
    password: 'Senha',
    loginForgotPassword: 'Esqueceu a senha?',
    cancel: 'Cancelar',
    registerTitle: 'Criar uma nova conta',
    or: 'ou',
    registerLoginLink: 'faça login na sua conta existente',
    fullName: 'Nome Completo',
    iAmA: 'Eu sou um(a):',
    client: 'Cliente',
    professional: 'Profissional',
    register: 'Registrar',
    accountVerification: 'Verificação de Conta',
    verificationCodeSentTo: 'Um código de verificação foi enviado para',
    verificationCode: 'Código de Verificação',
    verify: 'Verificar',
    resendCode: 'Reenviar código',

    // Main App
    dashboard: 'Painel',
    schedule: 'Agenda',
    search: 'Busca',
    adminPanel: 'Painel Admin',
    profile: 'Perfil',
    logout: 'Sair',
    newRequest: 'Novo Pedido',

    // Dashboard
    welcomeBack: 'Bem-vindo(a) de volta, {name}!',
    dashboardSummary: 'Aqui está um resumo de sua atividade recente.',
    pendingApproval: 'Aprovação Pendente',
    activeRequests: 'Solicitações Ativas',
    completed: 'Concluídas',
    activeJobs: 'Trabalhos Ativos',
    completedJobs: 'Trabalhos Concluídos',
    totalEarnings: 'Ganhos Totais',
    currency: 'BRL',
    completedRequests: 'Solicitações Concluídas',
    noServiceRequestsFound: 'Nenhuma solicitação de serviço encontrada.',
    quote: 'Orçamento',
    paid: 'Pago',
    approve: 'Aprovar',
    reject: 'Rejeitar',
    // FIX: Removed duplicate 'schedule' property to prevent object literal error.
    payNow: 'Pagar Agora',
    details: 'Detalhes',
    chat: 'Chat',

    // Admin
    totalRevenue: 'Receita Total',
    pendingApprovals: 'Aprovações Pendentes',
    activeServices: 'Serviços Ativos',
    totalProfessionals: 'Total de Profissionais',
    unassigned: 'Não atribuído',
    unknownClient: 'Cliente Desconhecido',
    confirmRejectRegistration: 'Tem certeza que deseja rejeitar este cadastro?',
    confirmDeleteCategory: 'Tem certeza que deseja excluir a categoria "{category}"?',
    noDataToExport: 'Nenhum dado para exportar.',
    reportExported: 'Relatório exportado com sucesso.',
    csvId: 'ID',
    csvClient: 'Cliente',
    csvProfessional: 'Profissional',
    csvService: 'Serviço',
    csvCompletionDate: 'Data de Conclusão',
    csvPaymentStatus: 'Status do Pagamento',
    csvBaseValue: 'Valor Base',
    csvTax: 'Imposto (7%)',
    csvTotalValue: 'Valor Total',

    // Profile
    noChangesDetected: 'Nenhuma alteração foi detectada.',
    errorInvalidFileFormat: 'Formato de arquivo inválido. Use JPEG, PNG ou GIF.',
    errorImageTooLarge: 'A imagem é muito grande. O tamanho máximo é 2MB.',
    errorCameraNotSupported: 'O acesso à câmera não é suportado pelo seu navegador.',
    errorAccessingCamera: 'Erro ao acessar a câmera. Verifique as permissões.',

    // Push Notifications
    pushNotificationsBlocked: 'As notificações push estão bloqueadas. Ative-as nas configurações do seu navegador.',
  }
};

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  language = signal<Language>('pt'); // Default to Portuguese

  setLanguage(lang: Language) {
    this.language.set(lang);
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const lang = this.language();
    let translation = translations[lang]?.[key] || key;

    if (params) {
      for (const paramKey in params) {
        translation = translation.replace(`{${paramKey}}`, String(params[paramKey]));
      }
    }

    return translation;
  }
}