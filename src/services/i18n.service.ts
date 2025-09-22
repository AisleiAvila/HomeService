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
    currency: "EUR",
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
    forgotPasswordDescription:
      "Enter your email address and we'll send you a verification code to reset your password.",
    sendResetCode: "Send Reset Code",
    resetCodeSent: "Reset code sent!",
    resetCodeSentDescription: "We've sent a 6-digit verification code to:",
    proceedToVerification: "I have the code",
    resendCode: "Resend Code",
    rememberPassword: "Remember your password?",
    backToLogin: "Back to Login",
    sending: "Sending...",
    resending: "Resending...",
    verifyCode: "Verify Code",
    verifyCodeDescription: "Enter the 6-digit code we sent to your email:",
    verificationCode: "Verification Code",
    codeFromEmail: "Check your email for the 6-digit code",
    verifying: "Verifying...",
    newPassword: "New Password",
    newPasswordDescription: "Choose a strong password for your account.",
    newPasswordPlaceholder: "Enter your new password",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "Confirm your new password",
    passwordRequirements: "Minimum 6 characters",
    passwordStrength: "Password Strength",
    updatePassword: "Update Password",
    updatingPassword: "Updating...",
    backToCodeVerification: "Back to Code Verification",
    emailPlaceholder: "Enter your email address",
    dontHaveAccount: "Don't have an account?",
    or: "or",
    cancel: "Cancel",
    ok: "OK",
    paid: "Paid",
    landingDescription:
      "Connect with trusted home service professionals in your area. Quality work, verified experts, and reliable service you can count on.",

    // Login / Register
    registerTitle: "Create a new account",
    registerLoginLink: "sign in to your existing account",
    loggingIn: "Logging in...",
    iAmA: "I am a",

    // Verification
    accountVerification: "Account Verification",
    verificationCodeSentTo: "A verification code has been sent to",
    verify: "Verify",
    registrationSuccessful: "Registration completed successfully!",
    password_reset_success:
      "Password reset successful! You can now log in with your new password.",
    checkEmailBeforeAccess:
      "Please check your email and confirm your account before accessing the application.",
    emailVerificationRequired:
      "Please check your email and click the verification link to activate your account.",
    emailNotVerifiedLogin:
      "Please verify your email before logging in. Check your email for the verification link.",

    // Dashboard
    welcomeBack: "Welcome!",
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
    viewRequestDetails: "View Request Details",
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
    professionalName: "Professional Name",
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

    // Calendar specific terms
    today: "Today",
    month: "Month",
    week: "Week",
    day: "Day",
    agenda: "Agenda",
    allDay: "All Day",
    noEventsForDay: "No events for this day",
    moreEvents: "more events",

    // Service Status translations
    statusPending: "Pending",
    statusQuoted: "Quoted",
    statusApproved: "Approved",
    statusScheduled: "Scheduled",
    statusAssigned: "Assigned",
    statusInProgress: "In Progress",
    statusCompleted: "Completed",
    statusCancelled: "Cancelled",
    statusAwaitingExecutionDate: "Awaiting Execution Date",
    statusDateProposedByAdmin: "Date Proposed by Admin",
    statusAwaitingDateApproval: "Awaiting Date Approval",
    statusDateApprovedByClient: "Date Approved by Client",
    statusDateRejectedByClient: "Date Rejected by Client",
    statusAnalyzing: "Analyzing",
    statusAwaitingClarification: "Awaiting Clarification",
    statusAwaitingQuoteApproval: "Awaiting Quote Approval",
    statusQuoteRejected: "Quote Rejected",
    statusSearchingProfessional: "Searching Professional",
    statusProfessionalSelected: "Professional Selected",
    statusAwaitingProfessionalConfirmation:
      "Awaiting Professional Confirmation",
    statusCompletedAwaitingApproval: "Completed - Awaiting Approval",

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
    appName: "Menu",
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
    userStatusUpdated: 'User #{id} status updated to "{status}"',

    // Admin Dashboard
    overview: "Overview",
    requests: "Requests",
    approvals: "Approvals",
    finances: "Finances",
    professionals: "Professionals",
    categories: "Categories",
    clients: "Clients",
    pendingActions: "Pending Actions",
    request: "Request",
    actions: "Actions",
    noRequestsNeedAttention: "No requests need attention at this time",
    pendingRegistrations: "Pending Professional Registrations",
    noPendingRegistrations: "No pending registrations",
    phone: "Phone",
    completedServices: "Completed Services",
    totalTax: "Total Tax",
    outstandingAmount: "Outstanding Amount",
    financialDetails: "Financial Details",
    exportToCsv: "Export to CSV",
    service: "Service",
    date: "Date",
    payment: "Payment",
    total: "Total",
    action: "Action",
    generateInvoice: "Generate Invoice",
    manageProfessionals: "Manage Professionals",
    addProfessional: "Add Professional",
    addNewProfessional: "Add New Professional",
    specialties: "Specialties",
    edit: "Edit",
    addNewCategory: "Add New Category",
    categoryName: "Category Name",
    add: "Add",
    serviceCategories: "Service Categories",
    delete: "Delete",
    // Quote and Assignment
    quoteFor: "Quote for",
    quoteValue: "Quote Value",
    submit: "Submit",
    assignProfessional: "Assign Professional",
    assignProfessionalToScheduled: "Assign Professional to Scheduled Service",
    selectProfessionalFor: "Select a professional for",
    assign: "Assign",
    editProfessional: "Edit Professional",

    // Execution Date Proposal
    proposeExecutionDate: "Propose Execution Date",
    proposeExecutionDateFor: "Propose execution date for",
    proposedDate: "Proposed Date",
    proposedTime: "Proposed Time",
    notesForClient: "Notes for Client",
    optional: "Optional",
    notesForClientPlaceholder:
      "Additional information about the proposed date...",
    serviceDetails: "Service Details",
    approvedAmount: "Approved Amount",
    clientOriginallyRequestedFor: "Client originally requested for",
    proposeDate: "Propose Date",
    approveExecutionDate: "Approve Date",
    rejectExecutionDate: "Reject Date",
    executionDateProposed: "Execution date proposed for request #{id}",
    executionDateApproved: "Execution date approved for request #{id}",
    executionDateRejected: "Execution date rejected for request #{id}",

    // Invoice
    invoice: "Invoice",
    billedTo: "Billed To",
    serviceProvidedBy: "Service Provided By",
    serviceDescription: "Service Description",
    subtotal: "Subtotal",
    tax: "Tax",
    grandTotal: "Grand Total",
    thankYou: "Thank you for your business!",
    print: "Print",

    // Messages and notifications
    quoteSubmitted: "Quote submitted for request #{id}",
    quoteApproved: "Quote approved for request #{id}",
    quoteRejected: "Quote rejected for request #{id}",
    professionalAssigned:
      "Professional {professional} assigned to request #{id}",
    fillRequiredFields: "Please fill in all required fields",
    professionalAdded: "Professional {name} added successfully",
    professionalUpdated: "Professional {name} updated successfully",
    categoryAdded: "Category '{category}' added successfully",
    categoryAlreadyExists: "Category already exists",
    categoryUpdated: "Category updated from '{old}' to '{new}'",
    categoryDeleted: "Category '{category}' deleted successfully",
    viewQuote: "View Quote",
    provideQuote: "Provide Quote",
    analyzeRequest: "Analyze Request",
    requestClarification: "Request Clarification",
    sendQuote: "Send Quote",
    requestAnalysisStarted: "Analysis started for '{title}'",
    errorAnalyzingRequest: "Error analyzing request. Please try again.",
    enterClarificationRequest: "Enter your clarification request:",
    clarificationRequestSent: "Clarification request sent for '{title}'",
    errorRequestingClarification:
      "Error requesting clarification. Please try again.",

    // Client Management
    manageClients: "Manage Clients",
    clientManagementDescription:
      "View and manage all registered clients in the system",
    services: "Services",
    totalSpent: "Total Spent",
    lastService: "Last Service",
    activateClient: "Activate Client",
    deactivateClient: "Deactivate Client",
    approveClient: "Approve Client",
    rejectClient: "Reject Client",
    confirmDeactivateClient: "Are you sure you want to deactivate client?",
    clientActivated: "Client {name} has been activated",
    clientDeactivated: "Client {name} has been deactivated",
    noClientsFound: "No Clients Found",
    noClientsDescription:
      "No clients have registered yet. Clients will appear here once they create accounts.",
    emailNotVerified: "Email not verified",
    of: "of",
    never: "Never",
    viewDetails: "View Details",
    totalServices: "Total Services",
    activate: "Activate",
    deactivate: "Deactivate",

    // Service Request Details - Additional translations
    professionalResponses: "Professional Responses",
    requestInformation: "Request Information",
    estimatedDuration: "Estimated Duration",
    address: "Address",
    timeControl: "Time Control",
    availableActions: "Available Actions",
    loadingServiceRequest: "Loading service request...",
    scheduleService: "Schedule Service",
    startService: "Start Service",
    completeService: "Complete Service",
    nameNotAvailable: "Name not available",
    pending: "Pending",
    createdAt: "Created At",
    priority: "Priority",
    high: "High",
    medium: "Medium",
    low: "Low",
    responded: "Responded",
    accepted: "Accepted",
    rejected: "Rejected",

    // Workflow Timeline translations
    workflow_progress: "Workflow Progress",
    phase: "Phase",
    current_status: "Current Status",
    in_progress: "In Progress",
    possible_states: "Possible States",
    timing_information: "Timing Information",
    requested_at: "Requested At",
    scheduled_for: "Scheduled For",
    started_at: "Started At",
    completed_at: "Completed At",

    // Service Request Form - TRADUÇÕES EM FALTA ADICIONADAS
    newServiceRequest: "New Service Request",
    titlePlaceholder: "Enter service title...",
    selectCategory: "Select a category...",
    descriptionPlaceholder: "Describe what you need...",
    requestedDateTime: "Requested Date & Time",
    requestedDateTimeHelp: "When would you like this service to be performed?",
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
    selectConcelho: "Select municipality",
    postalCodeInvalidFormat: "Format: 0000-000",
    submitting: "Submitting",
    submitRequest: "Submit Request",
    awaitingQuote: "Awaiting Quote",
    requested: "Requested",
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
    currency: "EUR",
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
    forgotPasswordDescription:
      "Digite seu endereço de e-mail e enviaremos um código de verificação para redefinir sua senha.",
    sendResetCode: "Enviar Código",
    resetCodeSent: "Código enviado!",
    resetCodeSentDescription: "Enviamos um código de 6 dígitos para:",
    proceedToVerification: "Tenho o código",
    resendCode: "Reenviar Código",
    rememberPassword: "Lembra da sua senha?",
    backToLogin: "Voltar ao Login",
    sending: "Enviando...",
    resending: "Reenviando...",
    verifyCode: "Verificar Código",
    verifyCodeDescription:
      "Digite o código de 6 dígitos que enviamos para seu e-mail:",
    codeFromEmail: "Verifique seu e-mail para o código de 6 dígitos",
    verifying: "Verificando...",
    newPassword: "Nova Senha",
    newPasswordDescription: "Escolha uma senha forte para sua conta.",
    newPasswordPlaceholder: "Digite sua nova senha",
    confirmPassword: "Confirmar Senha",
    confirmPasswordPlaceholder: "Confirme sua nova senha",
    passwordRequirements: "Mínimo 6 caracteres",
    passwordStrength: "Força da Senha",
    updatePassword: "Atualizar Senha",
    updatingPassword: "Atualizando...",
    backToCodeVerification: "Voltar à Verificação do Código",
    emailPlaceholder: "Digite seu endereço de e-mail",
    dontHaveAccount: "Não tem uma conta?",
    or: "ou",
    cancel: "Cancelar",
    ok: "OK",
    paid: "Pago",
    landingDescription:
      "Conecte-se com profissionais de serviços domésticos de confiança na sua área. Trabalho de qualidade, especialistas verificados e serviço confiável em que pode confiar.",

    // Login / Register
    registerTitle: "Crie uma nova conta",
    registerLoginLink: "faça login na sua conta existente",
    loggingIn: "Fazendo login...",
    iAmA: "Eu sou um(a)",

    // Verification
    accountVerification: "Verificação de Conta",
    verificationCodeSentTo: "Um código de verificação foi enviado para",
    verificationCode: "Código de Verificação",
    verify: "Verificar",
    registrationSuccessful: "Cadastro realizado com sucesso!",
    password_reset_success:
      "Senha redefinida com sucesso! Agora pode fazer login com a sua nova senha.",
    checkEmailBeforeAccess:
      "Por favor, verifique seu email e confirme sua conta antes de acessar a aplicação.",
    emailVerificationRequired:
      "Por favor, verifique seu email e clique no link de verificação para ativar sua conta.",
    emailNotVerifiedLogin:
      "Por favor, verifique seu email antes de fazer login. Verifique seu email pelo link de verificação.",

    // Dashboard
    welcomeBack: "Bem-vindo(a)!",
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
    viewRequestDetails: "Detalhar Solicitação",
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
    professionalName: "Nome do Profissional",
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

    // Calendar specific terms
    today: "Hoje",
    month: "Mês",
    week: "Semana",
    day: "Dia",
    agenda: "Agenda",
    allDay: "Dia Todo",
    noEventsForDay: "Nenhum evento para este dia",
    moreEvents: "mais eventos",

    // Service Status translations
    statusPending: "Pendente",
    statusQuoted: "Orçamentado",
    statusApproved: "Aprovado",
    statusScheduled: "Agendado",
    statusAssigned: "Atribuído",
    statusInProgress: "Em Andamento",
    statusCompleted: "Concluído",
    statusCancelled: "Cancelado",
    statusAwaitingExecutionDate: "Aguardando Data de Execução",
    statusDateProposedByAdmin: "Data Proposta pelo Administrador",
    statusAwaitingDateApproval: "Aguardando Aprovação da Data",
    statusDateApprovedByClient: "Data Aprovada pelo Cliente",
    statusDateRejectedByClient: "Data Rejeitada pelo Cliente",
    statusAnalyzing: "Em Análise",
    statusAwaitingClarification: "Aguardando Esclarecimentos",
    statusAwaitingQuoteApproval: "Aguardando Aprovação do Orçamento",
    statusQuoteRejected: "Orçamento Rejeitado",
    statusSearchingProfessional: "Buscando Profissional",
    statusProfessionalSelected: "Profissional Selecionado",
    statusAwaitingProfessionalConfirmation:
      "Aguardando Confirmação do Profissional",
    statusCompletedAwaitingApproval: "Concluído - Aguardando Aprovação",

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
    appName: "Menu",
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
    userStatusUpdated: 'Usuário #{id} status atualizado para "{status}"',

    // Admin Dashboard
    overview: "Visão Geral",
    requests: "Solicitações",
    approvals: "Aprovações",
    finances: "Finanças",
    professionals: "Profissionais",
    categories: "Categorias",
    clients: "Clientes",
    pendingActions: "Ações Pendentes",
    request: "Solicitação",
    actions: "Ações",
    noRequestsNeedAttention:
      "Nenhuma solicitação precisa de atenção no momento",
    pendingRegistrations: "Registros de Profissionais Pendentes",
    noPendingRegistrations: "Nenhum registro pendente",
    phone: "Telefone",
    completedServices: "Serviços Concluídos",
    totalTax: "Total de Impostos",
    outstandingAmount: "Valor Pendente",
    financialDetails: "Detalhes Financeiros",
    exportToCsv: "Exportar para CSV",
    service: "Serviço",
    date: "Data",
    payment: "Pagamento",
    total: "Total",
    action: "Ação",
    generateInvoice: "Gerar Fatura",
    manageProfessionals: "Gerenciar Profissionais",
    addProfessional: "Adicionar Profissional",
    addNewProfessional: "Adicionar Novo Profissional",
    specialties: "Especialidades",
    edit: "Editar",
    addNewCategory: "Adicionar Nova Categoria",
    categoryName: "Nome da Categoria",
    add: "Adicionar",
    serviceCategories: "Categorias de Serviço",
    delete: "Excluir",

    // Quote and Assignment
    quoteFor: "Orçamento para",
    quoteValue: "Valor do Orçamento",
    submit: "Enviar",
    assignProfessional: "Atribuir Profissional",
    assignProfessionalToScheduled:
      "Atribuir Profissional à Solicitação Agendada",
    selectProfessionalFor: "Selecione um profissional para",
    assign: "Atribuir",
    editProfessional: "Editar Profissional",

    // Execution Date Proposal
    proposeExecutionDate: "Propor Data de Execução",
    proposeExecutionDateFor: "Propor data de execução para",
    proposedDate: "Data Proposta",
    proposedTime: "Hora Proposta",
    notesForClient: "Observações para o Cliente",
    optional: "Opcional",
    notesForClientPlaceholder:
      "Informações adicionais sobre a data proposta...",
    serviceDetails: "Detalhes do Serviço",
    approvedAmount: "Valor Aprovado",
    clientOriginallyRequestedFor: "Cliente originalmente solicitou para",
    proposeDate: "Propor Data",
    approveExecutionDate: "Aprovar Data",
    rejectExecutionDate: "Rejeitar Data",
    executionDateProposed: "Data de execução proposta para solicitação #{id}",
    executionDateApproved: "Data de execução aprovada para solicitação #{id}",
    executionDateRejected: "Data de execução rejeitada para solicitação #{id}",

    // Invoice
    invoice: "Fatura",
    billedTo: "Faturado para",
    serviceProvidedBy: "Serviço Prestado por",
    serviceDescription: "Descrição do Serviço",
    subtotal: "Subtotal",
    tax: "Imposto",
    grandTotal: "Total Geral",
    thankYou: "Obrigado pelo seu negócio!",
    print: "Imprimir",

    // Messages and notifications
    quoteSubmitted: "Orçamento enviado para solicitação #{id}",
    quoteApproved: "Orçamento aprovado para solicitação #{id}",
    quoteRejected: "Orçamento rejeitado para solicitação #{id}",
    professionalAssigned:
      "Profissional {professional} atribuído à solicitação #{id}",
    fillRequiredFields: "Por favor, preencha todos os campos obrigatórios",
    professionalAdded: "Profissional {name} adicionado com sucesso",
    professionalUpdated: "Profissional {name} atualizado com sucesso",
    categoryAdded: "Categoria '{category}' adicionada com sucesso",
    categoryAlreadyExists: "Categoria já existe",
    categoryUpdated: "Categoria atualizada de '{old}' para '{new}'",
    categoryDeleted: "Categoria '{category}' excluída com sucesso",
    viewQuote: "Ver Orçamento",
    provideQuote: "Fornecer Orçamento",
    analyzeRequest: "Analisar Solicitação",
    requestClarification: "Solicitar Esclarecimentos",
    sendQuote: "Enviar Orçamento",
    requestAnalysisStarted: "Análise iniciada para '{title}'",
    errorAnalyzingRequest: "Erro ao analisar solicitação. Tente novamente.",
    enterClarificationRequest: "Digite sua solicitação de esclarecimentos:",
    clarificationRequestSent:
      "Solicitação de esclarecimentos enviada para '{title}'",
    errorRequestingClarification:
      "Erro ao solicitar esclarecimentos. Tente novamente.",

    // Client Management
    manageClients: "Gerenciar Clientes",
    clientManagementDescription:
      "Visualizar e gerenciar todos os clientes cadastrados no sistema",
    services: "Serviços",
    totalSpent: "Total Gasto",
    lastService: "Último Serviço",
    activateClient: "Ativar Cliente",
    deactivateClient: "Desativar Cliente",
    approveClient: "Aprovar Cliente",
    rejectClient: "Rejeitar Cliente",
    confirmDeactivateClient:
      "Tem certeza de que deseja desativar este cliente?",
    clientActivated: "Cliente {name} foi ativado",
    clientDeactivated: "Cliente {name} foi desativado",
    noClientsFound: "Nenhum Cliente Encontrado",
    noClientsDescription:
      "Ainda não há clientes cadastrados. Os clientes aparecerão aqui quando criarem contas.",
    emailNotVerified: "Email não verificado",
    of: "de",
    never: "Nunca",
    viewDetails: "Ver Detalhes",
    totalServices: "Total de Serviços",
    activate: "Ativar",
    deactivate: "Desativar",

    // Service Request Details - Additional translations
    professionalResponses: "Respostas dos Profissionais",
    requestInformation: "Informações da Solicitação",
    estimatedDuration: "Duração Estimada",
    address: "Endereço",
    timeControl: "Controlo de Tempo",
    availableActions: "Ações Disponíveis",
    loadingServiceRequest: "Carregando solicitação de serviço...",
    scheduleService: "Agendar Serviço",
    startService: "Iniciar Serviço",
    completeService: "Completar Serviço",
    nameNotAvailable: "Nome não disponível",
    pending: "Pendente",
    createdAt: "Criado em",
    priority: "Prioridade",
    high: "Alta",
    medium: "Média",
    low: "Baixa",
    responded: "Respondeu",
    accepted: "Aceito",
    rejected: "Rejeitado",

    // Workflow Timeline translations
    workflow_progress: "Progresso do Fluxo de Trabalho",
    phase: "Fase",
    current_status: "Status Atual",
    in_progress: "Em Progresso",
    possible_states: "Estados Possíveis",
    timing_information: "Informações de Timing",
    requested_at: "Solicitado em",
    scheduled_for: "Agendado para",
    started_at: "Iniciado em",
    completed_at: "Concluído em",

    // Service Request Form - TRADUÇÕES EM FALTA ADICIONADAS
    newServiceRequest: "Nova Solicitação de Serviço",
    titlePlaceholder: "Digite o título do serviço...",
    selectCategory: "Selecione uma categoria...",
    descriptionPlaceholder: "Descreva o que você precisa...",
    requestedDateTime: "Data e Hora Solicitada",
    requestedDateTimeHelp:
      "Quando você gostaria que este serviço fosse realizado?",
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
    selectConcelho: "Selecione o concelho",
    postalCodeInvalidFormat: "Formato: 0000-000",
    submitting: "Enviando",
    submitRequest: "Enviar Solicitação",
    awaitingQuote: "Aguardando Orçamento",
    requested: "Solicitado",
  },
};

@Injectable({
  providedIn: "root",
})
export class I18nService {
  readonly language = signal<Language>("en"); // Idioma padrão inglês

  constructor() {
    console.log("🚀 I18nService constructor - Service initialized");
    console.log("🚀 Available translations:", Object.keys(allTranslations));
    console.log(
      "🚀 EN landingDescription:",
      allTranslations.en?.landingDescription
    );
    console.log(
      "🚀 PT landingDescription:",
      allTranslations.pt?.landingDescription
    );

    // Carregar idioma salvo do localStorage
    const savedLang = localStorage.getItem("homeservice-language") as Language;
    console.log("🚀 Saved language from localStorage:", savedLang);
    if (savedLang && (savedLang === "en" || savedLang === "pt")) {
      this.language.set(savedLang);
    }
    console.log("🚀 Final language set to:", this.language());
  }

  setLanguage(lang: Language) {
    this.language.set(lang);
    localStorage.setItem("homeservice-language", lang);
    // Força reload da página para garantir que as traduções sejam atualizadas
    window.location.reload();
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const lang = this.language();

    // Debug completo para QUALQUER chave
    console.log("=== I18N TRANSLATE DEBUG ===");
    console.log("Key requested:", key);
    console.log("Current language:", lang);
    console.log("allTranslations exists:", !!allTranslations);
    console.log("allTranslations[lang] exists:", !!allTranslations[lang]);

    if (allTranslations[lang]) {
      console.log(
        "Available keys:",
        Object.keys(allTranslations[lang]).slice(0, 10)
      );
      console.log("Key exists in translations:", key in allTranslations[lang]);
      console.log("Direct value:", allTranslations[lang][key]);
    }

    let translation = allTranslations[lang]?.[key] || key;

    if (params) {
      Object.keys(params).forEach((paramKey) => {
        translation = translation.replace(
          `{${paramKey}}`,
          String(params[paramKey])
        );
      });
    }

    console.log("Final translation result:", translation);
    console.log("=== END DEBUG ===");

    return translation;
  }
}
