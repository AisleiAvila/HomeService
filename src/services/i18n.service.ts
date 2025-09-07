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
    profileUpdatedSuccessfully: "Profile updated successfully!",
    errorInvalidFileFormat: "Invalid file format. Please use JPG, PNG, or GIF.",
    errorImageTooLarge: "Image is too large. Maximum size is 2MB.",
    errorCameraNotSupported: "Camera access is not supported by your browser.",
    errorAccessingCamera: "Error accessing camera.",
    errorCameraPermissionDenied:
      "Camera permission was denied. Please allow camera access and try again.",
    errorNoCameraFound: "No camera found on this device.",
    errorCameraInUse: "Camera is already in use by another application.",
    errorCameraConstraints:
      "Camera constraints are not supported by your device.",
    errorVideoNotAvailable: "Video stream is not available.",
    errorVideoNotReady: "Video is not ready for capture. Please wait a moment.",
    errorCanvasNotSupported: "Canvas is not supported by your browser.",
    errorCapturingPhoto: "Error capturing photo. Please try again.",
    errorUploadingPhoto: "Error uploading photo. Please try again.",
    errorVideoPlayback: "Error playing video stream.",
    photoUploadedSuccessfully: "Photo uploaded successfully!",
    uploadPhoto: "Upload Photo",
    useCamera: "Use Camera",
    capturePhoto: "Capture Photo",
    capture: "Capture",
    saveChanges: "Save Changes",
    mySpecialties: "My Specialties",
    emailAddress: "Email Address",
    loadingCamera: "Loading camera...",
    cameraInstructions:
      "Position yourself in the frame and click capture when ready.",
    solutionPermissionDenied:
      "💡 Solution: Click the camera icon in the address bar and allow camera access, then reload the page.",
    solutionNoCameraFound:
      "💡 Solution: Connect a camera to your device or check if it's working in other apps.",
    solutionCameraInUse:
      "💡 Solution: Close other apps that might be using the camera (Teams, Zoom, Skype, etc.) and try again.",
    solutionCameraConstraints:
      "💡 Solution: Try using a different camera or check camera settings.",
    solutionCameraAborted:
      "💡 Solution: The operation was cancelled. Please try again.",
    solutionCameraTypeError:
      "💡 Solution: This appears to be a browser compatibility issue. Try using Chrome or updating your browser.",
    errorCameraAborted: "Camera operation was cancelled.",
    errorCameraTypeError: "Browser compatibility issue with camera access.",
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

    // Additional translations for missing keys
    appName: "MaintainApp",
    appNameFull: "Home Service Pro",
    newRequest: "New Request",
    loadingUser: "Loading user...",
    noMessages: "No messages yet. Start the conversation!",
    typeMessage: "Type your message...",
    searchServiceRequests: "Search Service Requests",
    searchTerm: "Search Term",
    searchTermPlaceholder: "Enter search term...",
    allCategories: "All Categories",
    completedRequests: "Completed Requests",
    fullName: "Full Name",

    // Status change notifications
    statusChangedFromTo: 'Request #{id} status changed from "{from}" to "{to}"',
    paymentStatusChanged: 'Request #{id} payment status changed to "{status}"',
    professionalApproved: "Professional {name} has been approved",
    professionalRejected: "Professional {name} has been rejected",
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
    profileUpdatedSuccessfully: "Perfil atualizado com sucesso!",
    errorInvalidFileFormat: "Formato de arquivo inválido. Use JPG, PNG ou GIF.",
    errorImageTooLarge: "A imagem é muito grande. O tamanho máximo é 2MB.",
    errorCameraNotSupported:
      "O acesso à câmera não é suportado pelo seu navegador.",
    errorAccessingCamera: "Erro ao acessar a câmera.",
    errorCameraPermissionDenied:
      "Permissão da câmera foi negada. Por favor, permita o acesso à câmera e tente novamente.",
    errorNoCameraFound: "Nenhuma câmera encontrada neste dispositivo.",
    errorCameraInUse: "A câmera já está sendo usada por outro aplicativo.",
    errorCameraConstraints:
      "As configurações da câmera não são suportadas pelo seu dispositivo.",
    errorVideoNotAvailable: "O fluxo de vídeo não está disponível.",
    errorVideoNotReady:
      "O vídeo não está pronto para captura. Por favor, aguarde um momento.",
    errorCanvasNotSupported: "Canvas não é suportado pelo seu navegador.",
    errorCapturingPhoto: "Erro ao capturar foto. Por favor, tente novamente.",
    errorUploadingPhoto:
      "Erro ao fazer upload da foto. Por favor, tente novamente.",
    errorVideoPlayback: "Erro na reprodução do fluxo de vídeo.",
    photoUploadedSuccessfully: "Foto enviada com sucesso!",
    uploadPhoto: "Enviar Foto",
    useCamera: "Usar Câmera",
    capturePhoto: "Capturar Foto",
    capture: "Capturar",
    saveChanges: "Salvar Alterações",
    mySpecialties: "Minhas Especialidades",
    emailAddress: "Endereço de E-mail",
    loadingCamera: "Carregando câmera...",
    cameraInstructions:
      "Posicione-se no quadro e clique em capturar quando estiver pronto.",
    solutionPermissionDenied:
      "💡 Solução: Clique no ícone da câmera na barra de endereços e permita o acesso, depois recarregue a página.",
    solutionNoCameraFound:
      "💡 Solução: Conecte uma câmera ao seu dispositivo ou verifique se está funcionando em outros apps.",
    solutionCameraInUse:
      "💡 Solução: Feche outros aplicativos que possam estar usando a câmera (Teams, Zoom, Skype, etc.) e tente novamente.",
    solutionCameraConstraints:
      "💡 Solução: Tente usar uma câmera diferente ou verifique as configurações da câmera.",
    solutionCameraAborted:
      "💡 Solução: A operação foi cancelada. Por favor, tente novamente.",
    solutionCameraTypeError:
      "💡 Solução: Parece ser um problema de compatibilidade do navegador. Tente usar o Chrome ou atualize seu navegador.",
    errorCameraAborted: "Operação da câmera foi cancelada.",
    errorCameraTypeError:
      "Problema de compatibilidade do navegador com acesso à câmera.",
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

    // Additional translations for missing keys
    appName: "MaintainApp",
    appNameFull: "Home Service Pro",
    newRequest: "Nova Solicitação",
    loadingUser: "Carregando usuário...",
    noMessages: "Ainda não há mensagens. Comece a conversa!",
    typeMessage: "Digite sua mensagem...",
    searchServiceRequests: "Buscar Solicitações de Serviço",
    searchTerm: "Termo de Busca",
    searchTermPlaceholder: "Digite o termo de busca...",
    allCategories: "Todas as Categorias",
    completedRequests: "Solicitações Concluídas",
    fullName: "Nome Completo",

    // Status change notifications
    statusChangedFromTo:
      'Solicitação #{id} mudou status de "{from}" para "{to}"',
    paymentStatusChanged:
      'Solicitação #{id} mudou status de pagamento para "{status}"',
    professionalApproved: "Profissional {name} foi aprovado",
    professionalRejected: "Profissional {name} foi rejeitado",
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
