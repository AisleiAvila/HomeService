// FIX: This file was a placeholder. It has been implemented to provide internationalization services.
import { Injectable, signal } from '@angular/core';

export type Language = 'en' | 'pt';

const allTranslations: Record<Language, Record<string, string>> = {
  en: {
    // General
    'signIn': 'Sign In',
    'createAccount': 'Create Account',
    'email': 'Email',
    'password': 'Password',
    'name': 'Full Name',
    'role': 'Role',
    'client': 'Client',
    'professional': 'Professional',
    'register': 'Register',
    'login': 'Login',
    'logout': 'Logout',
    'dashboard': 'Dashboard',
    'schedule': 'Schedule',
    'search': 'Search',
    'profile': 'Profile',
    'admin': 'Admin',
    'language': 'Language',
    'english': 'English',
    'portuguese': 'Português',
    'currency': 'USD',
    'unassigned': 'Unassigned',
    'unknownClient': 'Unknown Client',
    'noChangesDetected': 'No changes detected.',
    'errorInvalidFileFormat': 'Invalid file format. Please use JPG, PNG, or GIF.',
    'errorImageTooLarge': 'Image is too large. Maximum size is 2MB.',
    'errorCameraNotSupported': 'Camera access is not supported by your browser.',
    'errorAccessingCamera': 'Error accessing camera.',
    'pushNotificationsBlocked': 'Push notifications are blocked. Please enable them in your browser settings.',
    'noDataToExport': 'No financial data to export.',
    'reportExported': 'Financial report exported successfully.',
    'confirmRejectRegistration': 'Are you sure you want to reject this registration?',
    'confirmDeleteCategory': 'Are you sure you want to delete the category "{category}"?',
    'backToHome': 'Back to Home',
    'forgotPassword': 'Forgot your password?',
    'dontHaveAccount': "Don't have an account?",

    // Dashboard
    'pendingApproval': 'Pending',
    'activeRequests': 'Active',
    'completed': 'Completed',
    'activeJobs': 'Active Jobs',
    'completedJobs': 'Completed Jobs',
    'totalEarnings': 'Total Earnings',

    // Admin
    'totalRevenue': 'Total Revenue',
    'pendingApprovals': 'Pending Approvals',
    'activeServices': 'Active Services',
    'totalProfessionals': 'Total Professionals',
    'csvId': 'ID',
    'csvClient': 'Client',
    'csvProfessional': 'Professional',
    'csvService': 'Service',
    'csvCompletionDate': 'Completion Date',
    'csvPaymentStatus': 'Payment Status',
    'csvBaseValue': 'Base Value',
    'csvTax': 'Tax (7%)',
    'csvTotalValue': 'Total Value',
  },
  pt: {
    // General
    'signIn': 'Entrar',
    'createAccount': 'Criar Conta',
    'email': 'E-mail',
    'password': 'Senha',
    'name': 'Nome Completo',
    'role': 'Função',
    'client': 'Cliente',
    'professional': 'Profissional',
    'register': 'Registrar',
    'login': 'Login',
    'logout': 'Sair',
    'dashboard': 'Painel',
    'schedule': 'Agenda',
    'search': 'Buscar',
    'profile': 'Perfil',
    'admin': 'Admin',
    'language': 'Idioma',
    'english': 'English',
    'portuguese': 'Português',
    'currency': 'BRL',
    'unassigned': 'Não atribuído',
    'unknownClient': 'Cliente desconhecido',
    'noChangesDetected': 'Nenhuma alteração detectada.',
    'errorInvalidFileFormat': 'Formato de arquivo inválido. Use JPG, PNG ou GIF.',
    'errorImageTooLarge': 'A imagem é muito grande. O tamanho máximo é 2MB.',
    'errorCameraNotSupported': 'O acesso à câmera não é suportado pelo seu navegador.',
    'errorAccessingCamera': 'Erro ao acessar a câmera.',
    'pushNotificationsBlocked': 'As notificações push estão bloqueadas. Por favor, habilite-as nas configurações do seu navegador.',
    'noDataToExport': 'Nenhum dado financeiro para exportar.',
    'reportExported': 'Relatório financeiro exportado com sucesso.',
    'confirmRejectRegistration': 'Tem certeza de que deseja rejeitar este registro?',
    'confirmDeleteCategory': 'Tem certeza de que deseja excluir a categoria "{category}"?',
    'backToHome': 'Voltar para Início',
    'forgotPassword': 'Esqueceu sua senha?',
    'dontHaveAccount': 'Não tem uma conta?',
    
    // Dashboard
    'pendingApproval': 'Pendentes',
    'activeRequests': 'Ativas',
    'completed': 'Concluídas',
    'activeJobs': 'Trabalhos Ativos',
    'completedJobs': 'Trabalhos Concluídos',
    'totalEarnings': 'Ganhos Totais',
    
    // Admin
    'totalRevenue': 'Receita Total',
    'pendingApprovals': 'Aprovações Pendentes',
    'activeServices': 'Serviços Ativos',
    'totalProfessionals': 'Total de Profissionais',
    'csvId': 'ID',
    'csvClient': 'Cliente',
    'csvProfessional': 'Profissional',
    'csvService': 'Serviço',
    'csvCompletionDate': 'Data de Conclusão',
    'csvPaymentStatus': 'Status do Pagamento',
    'csvBaseValue': 'Valor Base',
    'csvTax': 'Imposto (7%)',
    'csvTotalValue': 'Valor Total',
  }
};

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  readonly language = signal<Language>('en');

  setLanguage(lang: Language) {
    this.language.set(lang);
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const lang = this.language();
    let translation = allTranslations[lang][key] || key;
    if (params) {
      Object.keys(params).forEach(paramKey => {
        translation = translation.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }
    return translation;
  }
}
