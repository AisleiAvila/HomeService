import { Injectable, signal } from '@angular/core';

export type Language = 'en' | 'pt';

const translations: Record<Language, Record<string, string>> = {
  en: {
    // General
    dashboard: 'Dashboard',
    schedule: 'Schedule',
    search: 'Search',
    adminPanel: 'Admin Panel',
    logout: 'Logout',
    newRequest: 'New Request',
    currency: 'USD',
    // Login
    login: 'Log in to your account',
    or: 'or',
    createAnAccount: 'create an account',
    emailAddress: 'Email address',
    password: 'Password',
    forgotPassword: 'Forgot your password?',
    signIn: 'Sign In',
    cancel: 'Cancel',
    forgotPasswordEmailMissing: 'Please enter your email address to reset your password.',
    // Dashboard stats
    pendingApproval: 'Pending Approval',
    activeRequests: 'Active Requests',
    completed: 'Completed',
    activeJobs: 'Active Jobs',
    completedJobs: 'Completed Jobs',
    totalEarnings: 'Total Earnings',
    // Admin
    totalRevenue: 'Total Revenue',
    pendingApprovals: 'Pending Approvals',
    activeServices: 'Active Services',
    totalProfessionals: 'Total Professionals',
    unassigned: 'Unassigned',
    unknownClient: 'Unknown Client',
    confirmRejectRegistration: 'Are you sure you want to reject this registration?',
    confirmDeleteCategory: 'Are you sure you want to delete the category "{category}"?',
    noDataToExport: 'No financial data to export.',
    reportExported: 'Financial report exported successfully.',
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
    errorInvalidFileFormat: 'Invalid file format. Please upload a JPG, PNG, or GIF.',
    errorImageTooLarge: 'Image is too large. The maximum size is 2MB.',
    errorCameraNotSupported: 'Camera access is not supported by your browser.',
    errorAccessingCamera: 'Error accessing camera.',
    // Push notifications
    pushNotificationsBlocked: 'Push notifications are blocked. Please enable them in your browser settings.',
  },
  pt: {
    // General
    dashboard: 'Painel',
    schedule: 'Agenda',
    search: 'Busca',
    adminPanel: 'Painel do Admin',
    logout: 'Sair',
    newRequest: 'Novo Pedido',
    currency: 'BRL',
    // Login
    login: 'Acesse sua conta',
    or: 'ou',
    createAnAccount: 'crie uma conta',
    emailAddress: 'Endereço de e-mail',
    password: 'Senha',
    forgotPassword: 'Esqueceu sua senha?',
    signIn: 'Entrar',
    cancel: 'Cancelar',
    forgotPasswordEmailMissing: 'Por favor, insira seu endereço de e-mail para redefinir sua senha.',
    // Dashboard stats
    pendingApproval: 'Aprovação Pendente',
    activeRequests: 'Pedidos Ativos',
    completed: 'Concluídos',
    activeJobs: 'Trabalhos Ativos',
    completedJobs: 'Trabalhos Concluídos',
    totalEarnings: 'Ganhos Totais',
    // Admin
    totalRevenue: 'Receita Total',
    pendingApprovals: 'Aprovações Pendentes',
    activeServices: 'Serviços Ativos',
    totalProfessionals: 'Total de Profissionais',
    unassigned: 'Não atribuído',
    unknownClient: 'Cliente desconhecido',
    confirmRejectRegistration: 'Tem certeza que deseja rejeitar este cadastro?',
    confirmDeleteCategory: 'Tem certeza que deseja excluir a categoria "{category}"?',
    noDataToExport: 'Nenhum dado financeiro para exportar.',
    reportExported: 'Relatório financeiro exportado com sucesso.',
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
    errorInvalidFileFormat: 'Formato de arquivo inválido. Por favor, envie um JPG, PNG ou GIF.',
    errorImageTooLarge: 'A imagem é muito grande. O tamanho máximo é 2MB.',
    errorCameraNotSupported: 'O acesso à câmera não é suportado pelo seu navegador.',
    errorAccessingCamera: 'Erro ao acessar a câmera.',
    // Push notifications
    pushNotificationsBlocked: 'As notificações push estão bloqueadas. Por favor, ative-as nas configurações do seu navegador.',
  }
};


@Injectable({
  providedIn: 'root'
})
export class I18nService {
  language = signal<Language>('en');

  setLanguage(lang: Language) {
    this.language.set(lang);
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const lang = this.language();
    let translation = translations[lang][key] || key;

    if (params) {
      Object.keys(params).forEach(paramKey => {
        translation = translation.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }

    return translation;
  }
}
