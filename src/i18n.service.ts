// FIX: This file was a placeholder. It has been implemented to provide internationalization services.
import { Injectable, signal } from "@angular/core";

export type Language = "en" | "pt";

const allTranslations: Record<Language, Record<string, string>> = {
  en: {
    // General
    signIn: "Sign In",
    createAccount: "Create Account",
    email: "Email",
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
    currency: "EUR",
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

    // Address fields (Portugal context)
    streetAddress: "Complete Address",
    streetAddressPlaceholder:
      "Street/Avenue, number, floor (e.g.: Rua Augusta, 123, 2º)",
    postalCode: "Postal Code",
    postalCodePlaceholder: "0000-000",
    locality: "Locality",
    localityPlaceholder: "Lisbon, Porto, Coimbra...",
    district: "District",
    selectDistrict: "Select district",
    concelho: "Municipality (Optional)",
    concelhoPlaceholder: "Lisbon, Porto, Sintra...",
    freguesia: "Parish (Optional)",
    postalCodeInvalidFormat: "Format: 0000-000",

    // Pagination
    itemsPerPage: "Items per page",
    showing: "Showing",
    to: "to",
    of: "of",
    results: "results",

    // Dashboard
    pendingApproval: "Pending",
    activeRequests: "Active",
    completed: "Completed",
    activeJobs: "Active Jobs",
    completedJobs: "Completed Jobs",
    totalEarnings: "Total Earnings",

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
    awaitingQuote: "Awaiting Quote",
    mobileRotateDeviceTip: "Tip: Rotate device for better calendar view",
    selectTime: "Select a time",
    serviceDetails: "Service Details",
    noCategoriesAvailable: "No categories available",
    description: "Description",
    category: "Category",
    address: "Address",
    appName: "HomeService",
    newRequest: "New Request",
    loadingUser: "Loading user...",
    accountVerification: "Account Verification",
    verificationCodeSentTo: "A verification code was sent to",
    checkEmailBeforeAccess:
      "Please check your email and enter the verification code to access the application.",
    verificationCode: "Verification Code",
    verify: "Verify",
    resendCode: "Resend Code",
    noServiceRequestsFound: "No service requests found",
    viewRequestDetails: "View Request Details",
    chat: "Chat",
    approve: "Approve",
    reject: "Reject",
    payNow: "Pay Now",
    paid: "Paid",
    requested: "Requested",
    scheduled: "Scheduled",
    emailVerificationRequired:
      "Email verification required. Please check your inbox.",
    exportToCsv: "Export to CSV",
    addProfessional: "Add Professional",
    serviceCategories: "Service Categories",
    companyAddress: "123 Service Lane, Anytown",
    invoice: "Invoice",
    appNameFull: "HomeService Solutions",
    quote: "Quote",
    details: "Details",
    scheduleAppointmentFor: "Schedule Appointment for",
    selectProfessional: "Select Professional",
    selectAProfessional: "Select a Professional",
    selectDate: "Select Date",
    cancel: "Cancel",
    confirmSchedule: "Confirm Schedule",
    pendingActions: "Pending Actions",
    request: "Request",
    status: "Status",
    actions: "Actions",
    viewQuote: "View Quote",
    provideQuote: "Provide Quote",
    provideClarification: "Provide Clarification",
    assign: "Assign",
    noRequestsNeedAttention: "No requests need attention",
    service: "Service",
    cost: "Cost",
    pendingRegistrations: "Pending Registrations",
    phone: "Phone",
    noPendingRegistrations: "No pending registrations",
    completedServices: "Completed Services",
    totalTax: "Total Tax",
    outstandingAmount: "Outstanding Amount",
    registrationSuccessful: "Registration Successful",

    // New Service Request Form
    newServiceRequest: "New Service Request",
    title: "Title",
    titlePlaceholder: "Enter service title...",
    selectCategory: "Select a category...",
    descriptionPlaceholder: "Describe what you need...",
    requestedDateTimeHelp: "When would you like this service to be performed?",
    submitting: "Submitting",
    submitRequest: "Submit Request",

    // Clarification Modal
    requestedClarification: "Requested Clarification",
    yourClarification: "Your Clarification",
    enterClarificationPlaceholder:
      "Please provide the requested clarification...",
    clarificationHelp:
      "Provide as much detail as possible to help us understand your requirements.",
    sendClarification: "Send Clarification",

    // Time Control and Scheduling
    timeControl: "Time Control",
    requestedDateTime: "Requested Date & Time",
    scheduledStartDateTime: "Scheduled Start Date & Time",
    estimatedDuration: "Estimated Duration",
    actualDuration: "Actual Duration",
    actualStartDateTime: "Actual Start Date & Time",
    actualEndDateTime: "Actual End Date & Time",
    startWork: "Start Work",
    finishWork: "Finish Work",
    serviceCompleted: "Service Completed",
    serviceInProgress: "Service In Progress",
    awaitingSchedule: "Awaiting Schedule",
    noActionAvailable: "No Action Available",
    adminActions: "Admin Actions",
    useSchedulerToManage: "Use the scheduler to manage this service",
    scheduleService: "Schedule Service",
    serviceInformation: "Service Information",
    notSpecified: "Not Specified",
    selectOption: "Select an option",
    specialist: "Specialist",
    noProfessionalsAvailable: "No professionals available for this category",
    scheduledDate: "Scheduled Date",
    scheduledTime: "Scheduled Time",
    hours: "Hours",
    minutes: "Minutes",
    totalDuration: "Total Duration",
    serviceDescription: "Service Description",
    serviceAddress: "Service Address",
    timeReports: "Time Reports",
    exportCSV: "Export CSV",
    filters: "Filters",
    period: "Period",
    today: "Today",
    lastWeek: "Last Week",
    lastMonth: "Last Month",
    customPeriod: "Custom Period",
    allCategories: "All Categories",
    startDate: "Start Date",
    endDate: "End Date",
    totalRequests: "Total Requests",
    completionRate: "Completion Rate",
    averageDuration: "Average Duration",
    onTimePercentage: "On Time Percentage",
    professionalProductivity: "Professional Productivity",
    completedServicesCount: "Completed Services",
    noDataAvailable: "No data available",
    todayScheduledServices: "Today's Scheduled Services",
    delayedServices: "Delayed Services",
    delayed: "Delayed",
    detailedServiceList: "Detailed Service List",
    professionalName: "Professional",
    scheduledLabel: "Scheduled",
    duration: "Duration",
    estimated: "Estimated",
    actual: "Actual",
    accessDenied: "Access Denied",
    adminAccessRequired: "Administrator access required",
  },
  pt: {
    // General
    signIn: "Entrar",
    createAccount: "Criar Conta",
    email: "E-mail",
    password: "Senha",
    name: "Nome Completo",
    role: "Função",
    client: "Cliente",
    professional: "Profissional",
    register: "Registrar",
    login: "Login",
    logout: "Sair",
    dashboard: "Painel",
    schedule: "Agenda",
    search: "Buscar",
    profile: "Perfil",
    admin: "Admin",
    language: "Idioma",
    english: "English",
    portuguese: "Português",
    currency: "EUR",
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

    // Address fields (Portugal context)
    streetAddress: "Morada Completa",
    streetAddressPlaceholder:
      "Rua/Avenida, número, andar (ex: Rua Augusta, 123, 2º)",
    postalCode: "Código Postal",
    postalCodePlaceholder: "0000-000",
    locality: "Localidade",
    localityPlaceholder: "Lisboa, Porto, Coimbra...",
    district: "Distrito",
    selectDistrict: "Selecione o distrito",
    concelho: "Concelho (Opcional)",
    concelhoPlaceholder: "Lisboa, Porto, Sintra...",
    freguesia: "Freguesia (Opcional)",
    postalCodeInvalidFormat: "Formato: 0000-000",

    // Pagination
    itemsPerPage: "Itens por página",
    showing: "Mostrando",
    to: "até",
    of: "de",
    results: "resultados",

    // Dashboard
    pendingApproval: "Pendentes",
    activeRequests: "Ativas",
    completed: "Concluídas",
    activeJobs: "Trabalhos Ativos",
    completedJobs: "Trabalhos Concluídos",
    totalEarnings: "Ganhos Totais",

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
    awaitingQuote: "Aguardando orçamento",
    mobileRotateDeviceTip:
      "Dica: Gire o dispositivo para melhor visualização da agenda",
    selectTime: "Selecione um horário",
    serviceDetails: "Detalhes do Serviço",
    noCategoriesAvailable: "Nenhuma categoria disponível",
    description: "Descrição",
    category: "Categoria",
    address: "Endereço",
    appName: "HomeService",
    newRequest: "Nova Solicitação",
    loadingUser: "Carregando usuário...",
    accountVerification: "Verificação de Conta",
    verificationCodeSentTo: "Um código de verificação foi enviado para",
    checkEmailBeforeAccess:
      "Por favor, verifique seu e-mail e insira o código de verificação para acessar a aplicação.",
    verificationCode: "Código de Verificação",
    verify: "Verificar",
    resendCode: "Reenviar Código",
    noServiceRequestsFound: "Nenhuma solicitação de serviço encontrada",
    viewRequestDetails: "Ver Detalhes da Solicitação",
    chat: "Chat",
    approve: "Aprovar",
    reject: "Rejeitar",
    payNow: "Pagar Agora",
    paid: "Pago",
    requested: "Solicitado",
    scheduled: "Agendado",
    emailVerificationRequired:
      "Verificação de e-mail necessária. Verifique sua caixa de entrada.",
    exportToCsv: "Exportar para CSV",
    addProfessional: "Adicionar Profissional",
    serviceCategories: "Categorias de Serviço",
    companyAddress: "Rua dos Serviços, 123, Lisboa",
    invoice: "Fatura",
    appNameFull: "HomeService Solutions",
    quote: "Orçamento",
    details: "Detalhes",
    scheduleAppointmentFor: "Agendar Compromisso para",
    selectProfessional: "Selecionar Profissional",
    selectAProfessional: "Selecione um Profissional",
    selectDate: "Selecionar Data",
    cancel: "Cancelar",
    confirmSchedule: "Confirmar Agendamento",
    pendingActions: "Ações Pendentes",
    request: "Solicitação",
    status: "Status",
    actions: "Ações",
    viewQuote: "Ver Orçamento",
    provideQuote: "Fornecer Orçamento",
    provideClarification: "Fornecer Esclarecimentos",
    assign: "Atribuir",
    noRequestsNeedAttention: "Nenhuma solicitação precisa de atenção",
    service: "Serviço",
    cost: "Custo",
    pendingRegistrations: "Registros Pendentes",
    phone: "Telefone",
    noPendingRegistrations: "Nenhum registro pendente",
    completedServices: "Serviços Concluídos",
    totalTax: "Imposto Total",
    outstandingAmount: "Valor em Aberto",
    registrationSuccessful: "Registro Bem-sucedido",

    // New Service Request Form
    newServiceRequest: "Nova Solicitação de Serviço",
    title: "Título",
    titlePlaceholder: "Digite o título do serviço...",
    selectCategory: "Selecione uma categoria...",
    descriptionPlaceholder: "Descreva o que você precisa...",
    requestedDateTimeHelp:
      "Quando você gostaria que este serviço fosse realizado?",
    submitting: "Enviando",
    submitRequest: "Enviar Solicitação",

    // Clarification Modal
    requestedClarification: "Esclarecimentos Solicitados",
    yourClarification: "Seus Esclarecimentos",
    enterClarificationPlaceholder:
      "Por favor, forneça os esclarecimentos solicitados...",
    clarificationHelp:
      "Forneça o máximo de detalhes possível para nos ajudar a compreender seus requisitos.",
    sendClarification: "Enviar Esclarecimentos",

    // Time Control and Scheduling
    timeControl: "Controle de Tempo",
    requestedDateTime: "Data e Hora Solicitada",
    scheduledStartDateTime: "Data e Hora Agendada para Início",
    estimatedDuration: "Duração Estimada",
    actualDuration: "Duração Real",
    actualStartDateTime: "Data e Hora Real de Início",
    actualEndDateTime: "Data e Hora Real do Final",
    startWork: "Iniciar Trabalho",
    finishWork: "Finalizar Trabalho",
    serviceCompleted: "Serviço Concluído",
    serviceInProgress: "Serviço em Progresso",
    awaitingSchedule: "Aguardando Agendamento",
    noActionAvailable: "Nenhuma Ação Disponível",
    adminActions: "Ações do Administrador",
    useSchedulerToManage: "Use o agendador para gerir este serviço",
    scheduleService: "Agendar Serviço",
    serviceInformation: "Informações do Serviço",
    notSpecified: "Não Especificado",
    selectOption: "Selecione uma opção",
    specialist: "Especialista",
    noProfessionalsAvailable:
      "Nenhum profissional disponível para esta categoria",
    scheduledDate: "Data Agendada",
    scheduledTime: "Hora Agendada",
    hours: "Horas",
    minutes: "Minutos",
    totalDuration: "Duração Total",
    serviceDescription: "Descrição do Serviço",
    serviceAddress: "Endereço do Serviço",
    timeReports: "Relatórios de Tempo",
    exportCSV: "Exportar CSV",
    filters: "Filtros",
    period: "Período",
    today: "Hoje",
    lastWeek: "Última Semana",
    lastMonth: "Último Mês",
    customPeriod: "Período Personalizado",
    allCategories: "Todas as Categorias",
    startDate: "Data de Início",
    endDate: "Data de Fim",
    totalRequests: "Total de Pedidos",
    completionRate: "Taxa de Conclusão",
    averageDuration: "Duração Média",
    onTimePercentage: "Percentagem No Horário",
    professionalProductivity: "Produtividade dos Profissionais",
    completedServicesCount: "Serviços Concluídos",
    noDataAvailable: "Nenhum dado disponível",
    todayScheduledServices: "Serviços Agendados para Hoje",
    delayedServices: "Serviços Atrasados",
    delayed: "Atrasado",
    detailedServiceList: "Lista Detalhada de Serviços",
    professionalName: "Profissional",
    scheduledLabel: "Agendado",
    duration: "Duração",
    estimated: "Estimado",
    actual: "Real",
    accessDenied: "Acesso Negado",
    adminAccessRequired: "Acesso de administrador necessário",
  },
};

@Injectable({
  providedIn: "root",
})
export class I18nService {
  readonly language = signal<Language>("en"); // Idioma padrão inglês

  constructor() {
    // Carregar idioma salvo do localStorage
    const savedLang = localStorage.getItem("homeservice-language") as Language;
    if (savedLang && (savedLang === "en" || savedLang === "pt")) {
      this.language.set(savedLang);
      console.log(`🌍 [I18N] Idioma carregado do localStorage: ${savedLang}`);
    }

    // Log inicial do estado
    console.log(`🌍 [I18N] Idioma inicial: ${this.language()}`);
    console.log(
      `🌍 [I18N] Testando tradução 'newServiceRequest': ${this.translate(
        "newServiceRequest"
      )}`
    );
  }

  setLanguage(lang: Language) {
    this.language.set(lang);
    localStorage.setItem("homeservice-language", lang);
    console.log(`🌍 [I18N] Idioma alterado para: ${lang}`);

    // Força reload da página para garantir que as traduções sejam atualizadas
    window.location.reload();
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const lang = this.language();
    const translations = allTranslations[lang];
    const translation = translations[key];

    // Debug extremo
    if (key === "newServiceRequest") {
      console.log(`� [EXTREME DEBUG] Key: ${key}`);
      console.log(`🚨 [EXTREME DEBUG] Lang: ${lang}`);
      console.log(
        `🚨 [EXTREME DEBUG] Has translations object:`,
        !!translations
      );
      console.log(`🚨 [EXTREME DEBUG] Direct lookup:`, translations[key]);
      console.log(
        `� [EXTREME DEBUG] All PT keys starting with 'new':`,
        Object.keys(allTranslations.pt).filter((k) => k.startsWith("new"))
      );
      console.log(
        `🚨 [EXTREME DEBUG] Key exists in PT:`,
        key in allTranslations.pt
      );
      console.log(
        `🚨 [EXTREME DEBUG] Expected value:`,
        allTranslations.pt.newServiceRequest
      );
    }

    let result = translation || key;

    if (params) {
      Object.keys(params).forEach((paramKey) => {
        result = result.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }
    return result;
  }
}
