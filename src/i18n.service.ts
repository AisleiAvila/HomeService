// FIX: This file was a placeholder. It has been implemented to provide internationalization services.
import { Injectable, signal } from "@angular/core";
import { scheduled } from "rxjs";
import { StatusService } from "./services/status.service";

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
    // phoneFormatError já definido acima
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
    serviceRequestDetails: "Service Request Details",
    noCategoriesAvailable: "No categories available",
    description: "Description",
    category: "Category",
    address: "Address",
    appName: "HomeService",
    menu: "Menu",
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
    choosePaymentMethod: "Choose Payment Method",
    confirmPayment: "Confirm Payment",
    paid: "Paid",
    requested: "Requested",
    scheduled: "Scheduled",
    validateQuote: "Validate Quote",
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
    // phoneFormatError já definido acima
    confirmSchedule: "Confirm Schedule",
    pendingActions: "Pending Actions",
    request: "Request",
    status: "Status",
    actions: "Actions",
    availableActions: "Available Actions",
    viewQuote: "View Quote",
    provideQuote: "Provide Quote",
    provideClarification: "Provide Clarification",
    approveQuote: "Approve Quote",
    requestRevision: "Request Revision",
    assign: "Assign",
    assignProfessional: "Assign Professional",
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
    password_reset_success:
      "Password reset successful! You can now log in with your new password.",

    // New Service Request Form
    newServiceRequest: "New Service Request",
    title: "Title",
    titlePlaceholder: "Enter service title...",
    selectCategory: "Select a category...",
    descriptionPlaceholder: "Describe what you need...",
    requestedDateTimeHelp: "When would you like this service to be performed?",
    submitting: "Submitting",
    submitRequest: "Submit Request",
    formErrorGeneric:
      "There was an error processing your request. Please try again.",
    formSuccessGeneric: "Your request was submitted successfully!",
    addressNotFound: "Address information not found. Please check your input.",
    searchingAddress: "Searching for address...",
    validatingPostalCode: "Validating postal code...",
    addressSelected: "Address selected successfully!",
    formProgress: "Form progress: {percent}% complete",
    fieldRequired: "This field is required",
    invalidPostalCode: "Invalid postal code format",
    dateInPast: "The date must be in the future",

    // Clarification Modal
    requestedClarification: "Requested Clarification",
    yourClarification: "Your Clarification",
    enterClarificationPlaceholder:
      "Please provide the requested clarification...",
    clarificationHelp:
      "Provide as much detail as possible to help us understand your requirements.",
    sendClarification: "Send Clarification",

    // Service Clarifications Component
    clarifications: "Clarifications",
    unread: "unread",
    addNewQuestion: "Add New Question",
    questionTitle: "Question Title",
    questionTitlePlaceholder: "Brief summary of your question...",
    questionContent: "Question Details",
    questionContentPlaceholder: "Describe your question in detail...",
    addQuestion: "Add Question",
    question: "Question",
    answer: "Answer",
    new: "New",
    by: "by",
    delete: "Delete",
    addAnswer: "Add Answer",
    answerTitle: "Answer Title",
    answerTitlePlaceholder: "Brief summary of your answer...",
    answerContent: "Answer Details",
    answerContentPlaceholder: "Provide your detailed answer...",
    noClarificationsYet: "No clarifications yet",
    addFirstQuestion: "Add the first question to start a discussion",
    confirmDeleteClarification:
      "Are you sure you want to delete this clarification?",

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

    // Assignment and Scheduling (New)
    schedulingInformation: "Scheduling Information",
    inMinutes: "in minutes",
    durationHelpText: "Duration in minutes (minimum 15, increments of 15)",
    quickSelect: "Quick Select",
    clientRequestedFor: "Client requested for",
    assignAndSchedule: "Assign & Schedule",
    professionalAssigned:
      "Professional {professional} assigned to request #{id}.",
    professionalAssignedAndScheduled:
      "Professional {professional} assigned to request #{id} and scheduled for {date}.",

    // Execution Date Management
    newExecutionDateProposed: "New Execution Date Proposed",
    executionDateProposedMessage:
      "Proposed date: {date} at {time}. Notes: {notes}",
    executionDateApprovedByClient: "Execution Date Approved by Client",
    executionDateRejectedByClient: "Execution Date Rejected by Client",
    executionDateApprovedMessage:
      "The client approved the execution date for request #{requestId}.",
    executionDateRejectedMessage:
      "The client rejected the execution date for request #{requestId}. Reason: {reason}",
    approveExecutionDate: "Approve Date",
    rejectExecutionDate: "Reject Date",
    executionDateProposed: "Execution date proposed for request #{id}",
    executionDateApproved: "Execution date approved for request #{id}",
    executionDateRejected: "Execution date rejected for request #{id}",

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
    forgotPasswordDescription:
      "Enter your email address and we'll send you a verification code to reset your password.",
    sendResetCode: "Send Reset Code",
    resetCodeSent: "Reset code sent!",
    resetCodeSentDescription: "We've sent a 6-digit verification code to:",
    proceedToVerification: "I have the code",
    rememberPassword: "Remember your password?",
    backToLogin: "Back to Login",
    sending: "Sending...",
    resending: "Resending...",
    verifyCode: "Verify Code",
    verifyCodeDescription: "Enter the 6-digit code we sent to your email:",
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
    or: "or",
    ok: "OK",
    landingDescription:
      "Connect with trusted home service professionals in your area. Quality work, verified experts, and reliable service you can count on.",

    // Login / Register
    registerTitle: "Create a new account",
    registerLoginLink: "sign in to your existing account",
    loggingIn: "Logging in...",
    iAmA: "I am a",

    // Verification
    emailNotVerifiedLogin:
      "Please verify your email before logging in. Check your email for the verification link.",

    // Dashboard
    welcomeBack: "Welcome!",
    dashboardSummary: "Here is a summary of your activity.",

    // Service List
    requestDate: "Request Date",
    costAndPayment: "Cost and Payment",
    paymentStatus: "Payment Status",
    assignedProfessional: "Assigned Professional",
    professionalId: "Professional ID",
    requestId: "Request ID",
    close: "Close",

    // Calendar specific terms
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

    // Additional translations for missing keys
    noMessages: "No messages yet. Start the conversation!",
    typeMessage: "Type your message...",
    searchServiceRequests: "Search Service Requests",
    searchTerm: "Search Term",
    searchTermPlaceholder: "Enter search term...",
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
    financialDetails: "Financial Details",
    date: "Date",
    payment: "Payment",
    total: "Total",
    action: "Action",
    generateInvoice: "Generate Invoice",
    manageProfessionals: "Manage Professionals",
    addNewProfessional: "Add New Professional",
    specialties: "Specialties",
    edit: "Edit",
    addNewCategory: "Add New Category",
    categoryName: "Category Name",
    add: "Add",
    // Quote and Assignment
    quoteFor: "Quote for",
    quoteValue: "Quote Value",
    submit: "Submit",
    assignProfessionalToScheduled: "Assign Professional to Scheduled Service",
    selectProfessionalFor: "Select a professional for",
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
    approvedAmount: "Approved Amount",
    clientOriginallyRequestedFor: "Client originally requested for",
    proposeDate: "Propose Date",

    // Invoice
    billedTo: "Billed To",
    serviceProvidedBy: "Service Provided By",
    subtotal: "Subtotal",
    tax: "Tax",
    grandTotal: "Grand Total",
    thankYou: "Thank you for your business!",
    print: "Print",

    // Messages and notifications
    quoteSubmitted: "Quote submitted for request #{id}",
    quoteApproved: "Quote approved for request #{id}",
    quoteRejected: "Quote rejected for request #{id}",
    fillRequiredFields: "Please fill in all required fields",
    professionalAdded: "Professional {name} added successfully",
    professionalUpdated: "Professional {name} updated successfully",
    categoryAdded: "Category '{category}' added successfully",
    categoryAlreadyExists: "Category already exists",
    categoryUpdated: "Category updated from '{old}' to '{new}'",
    categoryDeleted: "Category '{category}' deleted successfully",
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
    never: "Never",
    viewDetails: "View Details",
    totalServices: "Total Services",
    activate: "Activate",
    deactivate: "Deactivate",

    // Service Request Details - Additional translations
    professionalResponses: "Professional Responses",
    requestInformation: "Request Information",
    loadingServiceRequest: "Loading service request...",
    startService: "Start Service",
    finishService: "Finish Service",
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

    creditCard: "Credit Card",
    mbway: "MB WAY",
    bankTransfer: "Bank Transfer",
    statusGraphTitle: "Service Status Overview",
    categoryDistributionTitle: "Order Distribution by Category",
    categoryDistributionChart: "Category Distribution Chart",
    ordersByCategory: "Orders by Category",
    totalOrders: "Total Orders",
    activeClients: "Active Clients",
    noCategory: "No Category",
    quickActions: "Quick Actions",
    newService: "New Service",
    generateReport: "Generate Report",
    viewAllRequests: "View All Requests",
    manageUsers: "Manage Users",
    vsLastMonth: "vs last month",
    vsLastWeek: "vs last week",
    newToday: "new today",
    urgentItems: "urgent items",
    featureComingSoon: "Feature coming soon",
    temporalEvolutionTitle: "Request Evolution (Last 30 Days)",
    recentActivities: "Recent Activities",
    lastUpdate: "Last update",
    noRecentActivities: "No recent activities",
    requestCreated: "Request created",
    requestUpdated: "Request updated",
    requestCompleted: "Request completed",
    userRegistered: "User registered",
    paymentReceived: "Payment received",
    minutesAgo: "minutes ago",
    hoursAgo: "hours ago",
    daysAgo: "days ago",
    clearFilters: "Clear Filters",
    quickfilters: "Quick Filters",
    statusRequested: "Requested",
    statusInAnalysis: "In Analysis",
    scheduleTitle: "Schedule",
    selectStatus: "Select Status",
    filterByStatus: "Filter by Status",
    phoneNumber: "Phone Number",
    phoneFormatError:
      "Please enter the country code and phone number (e.g. +351 912 345 678)",
    sendVerificationCode: "Send Verification Code",
    enterSmsCode: "Enter the 6-digit code sent via SMS",
    smsSentInfo: "A verification code has been sent to",
    smsCodeValid: "Verification code is valid!",
    smsCodeInvalid: "Invalid code. Please try again.",
    validateCode: "Validate Code",
    smsVerification: "SMS Verification",
    smsSentSimulation: "(For simulation, the code is 123456)",
    smsCodeSentTo: "SMS code sent to",
    smsCodeExpired:
      "The verification code has expired. Please request a new one.",
    receiveSmsNotifications: "Receive SMS Notifications",
    personalData: "Personal Data",
    contactPreferences: "Contact Preferences",
    smsCodeLabel: "Code described in the SMS",
    smsCodePlaceholder: "Enter the code",
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
    serviceRequestDetails: "Detalhes da Solicitação de Serviço",
    noCategoriesAvailable: "Nenhuma categoria disponível",
    description: "Descrição",
    category: "Categoria",
    address: "Endereço",
    appName: "HomeService",
    menu: "Menu",
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
    choosePaymentMethod: "Escolher Método de Pagamento",
    confirmPayment: "Confirmar Pagamento",
    paid: "Pago",
    requested: "Solicitado",
    scheduled: "Agendado",
    validateQuote: "Validar Orçamento",
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
    availableActions: "Ações Disponíveis",
    viewQuote: "Ver Orçamento",
    provideQuote: "Fornecer Orçamento",
    provideClarification: "Fornecer Esclarecimento",
    approveQuote: "Aprovar Orçamento",
    requestRevision: "Solicitar Revisão",
    assign: "Atribuir",
    assignProfessional: "Atribuir Profissional",
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
    password_reset_success:
      "Senha redefinida com sucesso! Agora pode fazer login com a sua nova senha.",

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
    formErrorGeneric:
      "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.",
    formSuccessGeneric: "Sua solicitação foi enviada com sucesso!",
    addressNotFound:
      "Informações de endereço não encontradas. Por favor, verifique sua entrada.",
    searchingAddress: "Procurando endereço...",
    validatingPostalCode: "Validando código postal...",
    addressSelected: "Endereço selecionado com sucesso!",
    formProgress: "Progresso do formulário: {percent}% completo",
    fieldRequired: "Este campo é obrigatório",
    invalidPostalCode: "Formato de código postal inválido",
    dateInPast: "A data deve ser no futuro",

    // Clarification Modal
    requestedClarification: "Esclarecimentos Solicitados",
    yourClarification: "Seus Esclarecimentos",
    enterClarificationPlaceholder:
      "Por favor, forneça os esclarecimentos solicitados...",
    clarificationHelp:
      "Forneça o máximo de detalhes possível para nos ajudar a compreender seus requisitos.",
    sendClarification: "Enviar Esclarecimentos",

    // Service Clarifications Component
    clarifications: "Esclarecimentos",
    unread: "não lidos",
    addNewQuestion: "Adicionar Nova Pergunta",
    questionTitle: "Título da Pergunta",
    questionTitlePlaceholder: "Resumo breve da sua pergunta...",
    questionContent: "Detalhes da Pergunta",
    questionContentPlaceholder: "Descreva sua pergunta em detalhes...",
    addQuestion: "Adicionar Pergunta",
    question: "Pergunta",
    answer: "Resposta",
    new: "Novo",
    by: "por",
    delete: "Eliminar",
    addAnswer: "Adicionar Resposta",
    answerTitle: "Título da Resposta",
    answerTitlePlaceholder: "Resumo breve da sua resposta...",
    answerContent: "Detalhes da Resposta",
    answerContentPlaceholder: "Forneça sua resposta detalhada...",
    noClarificationsYet: "Ainda não há esclarecimentos",
    addFirstQuestion: "Adicione a primeira pergunta para iniciar uma discussão",
    confirmDeleteClarification:
      "Tem certeza de que deseja eliminar este esclarecimento?",

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

    // Assignment and Scheduling (New)
    schedulingInformation: "Informações de Agendamento",
    inMinutes: "em minutos",
    durationHelpText: "Duração em minutos (mínimo 15, incrementos de 15)",
    quickSelect: "Seleção Rápida",
    clientRequestedFor: "Cliente solicitou para",
    assignAndSchedule: "Atribuir e Agendar",
    professionalAssigned:
      "Profissional {professional} atribuído à solicitação #{id}.",
    professionalAssignedAndScheduled:
      "Profissional {professional} atribuído à solicitação #{id} e agendado para {date}.",

    // Execution Date Management
    newExecutionDateProposed: "Nova Data de Execução Proposta",
    executionDateProposedMessage:
      "Data proposta: {date} às {time}. Observações: {notes}",
    executionDateApprovedByClient: "Data de Execução Aprovada pelo Cliente",
    executionDateRejectedByClient: "Data de Execução Rejeitada pelo Cliente",
    executionDateApprovedMessage:
      "O cliente aprovou a data de execução para a solicitação #{requestId}.",
    executionDateRejectedMessage:
      "O cliente rejeitou a data de execução para a solicitação #{requestId}. Motivo: {reason}",
    approveExecutionDate: "Aprovar Data",
    rejectExecutionDate: "Rejeitar Data",
    executionDateProposed: "Data de execução proposta para solicitação #{id}",
    executionDateApproved: "Data de execução aprovada para solicitação #{id}",
    executionDateRejected: "Data de execução rejeitada para solicitação #{id}",

    // General
    assignProfessionalToScheduled: "Atribuir Profissional ao Serviço Agendado",
    selectProfessionalFor: "Selecione um profissional para",
    assigningProfessional: "Atribuindo profissional...",
    assignmentSuccess: "Profissional atribuído com sucesso!",
    assignmentError: "Erro ao atribuir profissional. Tente novamente.",
    assignmentTitle: "Atribuir Profissional",
    assignmentDescription: "Selecione um profissional e agende o serviço.",
    profileUpdatedSuccessfully: "Perfil atualizado com sucesso!",
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
    forgotPasswordDescription:
      "Digite seu endereço de e-mail e enviaremos um código de verificação para redefinir sua senha.",
    sendResetCode: "Enviar Código",
    resetCodeSent: "Código enviado!",
    resetCodeSentDescription: "Enviamos um código de 6 dígitos para:",
    proceedToVerification: "Tenho o código",
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
    or: "ou",
    ok: "OK",
    landingDescription:
      "Conecte-se com profissionais de serviços domésticos de confiança na sua área. Trabalho de qualidade, especialistas verificados e serviço confiável em que pode confiar.",

    // Login / Register
    registerTitle: "Crie uma nova conta",
    registerLoginLink: "faça login na sua conta existente",
    loggingIn: "Fazendo login...",
    iAmA: "Eu sou um(a)",

    // Verification
    emailNotVerifiedLogin:
      "Por favor, verifique seu email antes de fazer login. Verifique seu email pelo link de verificação.",

    // Dashboard
    welcomeBack: "Bem-vindo(a)!",
    dashboardSummary: "Aqui está um resumo da sua atividade.",

    // Service List
    basicInformation: "Informações Básicas",
    requestDate: "Data da Solicitação",
    costAndPayment: "Custo e Pagamento",
    paymentStatus: "Status do Pagamento",
    assignedProfessional: "Profissional Designado",
    professionalId: "ID do Profissional",
    requestId: "ID da Solicitação",
    close: "Fechar",

    // Calendar specific terms
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

    // Additional translations for missing keys
    noMessages: "Ainda não há mensagens. Comece a conversa!",
    typeMessage: "Digite sua mensagem...",
    searchServiceRequests: "Buscar Solicitações de Serviço",
    searchTerm: "Termo de Busca",
    searchTermPlaceholder: "Digite o termo de busca...",
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
    financialDetails: "Detalhes Financeiros",
    date: "Data",
    payment: "Pagamento",
    total: "Total",
    action: "Ação",
    generateInvoice: "Gerar Fatura",
    manageProfessionals: "Gerenciar Profissionais",
    addNewProfessional: "Adicionar Novo Profissional",
    specialties: "Especialidades",
    edit: "Editar",
    addNewCategory: "Adicionar Nova Categoria",
    categoryName: "Nome da Categoria",
    add: "Adicionar",

    // Quote and Assignment
    quoteFor: "Orçamento para",
    quoteValue: "Valor do Orçamento",
    submit: "Enviar",
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
    approvedAmount: "Valor Aprovado",
    clientOriginallyRequestedFor: "Cliente originalmente solicitou para",
    proposeDate: "Propor Data",

    // Invoice
    billedTo: "Faturado para",
    serviceProvidedBy: "Serviço Prestado por",
    subtotal: "Subtotal",
    tax: "Imposto",
    grandTotal: "Total Geral",
    thankYou: "Obrigado pelo seu negócio!",
    print: "Imprimir",

    // Messages and notifications
    quoteSubmitted: "Orçamento enviado para solicitação #{id}",
    quoteApproved: "Orçamento aprovado para solicitação #{id}",
    quoteRejected: "Orçamento rejeitado para solicitação #{id}",
    fillRequiredFields: "Por favor, preencha todos os campos obrigatórios",
    professionalAdded: "Profissional {name} adicionado com sucesso",
    professionalUpdated: "Profissional {name} atualizado com sucesso",
    categoryAdded: "Categoria '{category}' adicionada com sucesso",
    categoryAlreadyExists: "Categoria já existe",
    categoryUpdated: "Categoria atualizada de '{old}' para '{new}'",
    categoryDeleted: "Categoria '{category}' excluída com sucesso",
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
    never: "Nunca",
    viewDetails: "Ver Detalhes",
    totalServices: "Total de Serviços",
    activate: "Ativar",
    deactivate: "Desativar",

    // Service Request Details - Additional translations
    professionalResponses: "Respostas dos Profissionais",
    requestInformation: "Informações da Solicitação",
    loadingServiceRequest: "Carregando solicitação de serviço...",
    startService: "Iniciar Serviço",
    finishService: "Finalizar Serviço",
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

    selectConcelho: "Selecione o concelho",

    creditCard: "Cartão de Crédito",
    mbway: "MB WAY",
    bankTransfer: "Transferência Bancária",
    statusGraphTitle: "Distribuição dos Pedidos por Status",
    categoryDistributionTitle: "Distribuição de Pedidos por Categoria",
    categoryDistributionChart: "Gráfico de Distribuição por Categoria",
    ordersByCategory: "Pedidos por Categoria",
    totalOrders: "Total de Pedidos",
    activeClients: "Clientes Ativos",
    noCategory: "Sem Categoria",
    quickActions: "Ações Rápidas",
    newService: "Novo Serviço",
    generateReport: "Gerar Relatório",
    viewAllRequests: "Ver Todas as Solicitações",
    manageUsers: "Gerenciar Usuários",
    vsLastMonth: "vs mês anterior",
    vsLastWeek: "vs semana anterior",
    newToday: "novos hoje",
    urgentItems: "itens urgentes",
    featureComingSoon: "Funcionalidade em breve",
    temporalEvolutionTitle: "Evolução das Solicitações (Últimos 30 Dias)",
    recentActivities: "Atividades Recentes",
    lastUpdate: "Última atualização",
    noRecentActivities: "Nenhuma atividade recente",
    requestCreated: "Solicitação criada",
    requestUpdated: "Solicitação atualizada",
    requestCompleted: "Solicitação concluída",
    userRegistered: "Usuário registrado",
    paymentReceived: "Pagamento recebido",
    minutesAgo: "minutos atrás",
    hoursAgo: "horas atrás",
    daysAgo: "dias atrás",
    clearFilters: "Limpar Filtros",
    quickfilters: "Filtros Rápidos",
    statusRequested: "Solicitado",
    statusInAnalysis: "Em Análise",
    scheduleTitle: "Agenda",
    selectStatus: "Selecione o Status",
    filterByStatus: "Filtrar por Status",
    phoneNumber: "Número de Telefone",
    phoneFormatError:
      "Informe o código do país e o número do telefone (ex: +351 912 345 678)",
    sendVerificationCode: "Enviar Código de Verificação",
    enterSmsCode: "Digite o código de 6 dígitos enviado via SMS",
    smsSentInfo: "Um código de verificação foi enviado para",
    smsCodeValid: "Código válido",
    smsCodeInvalid: "Código inválido. Por favor, tente novamente.",
    validateCode: "Validar Código",
    smsVerification: "Verificação por SMS",
    smsSentSimulation: "(Para simulação, o código é 123456)",
    smsCodeSentTo: "Código SMS enviado para",
    smsCodeExpired: "O código de verificação expirou. Solicite um novo.",
    receiveSmsNotifications: "Receber Notificações por SMS",
    personalData: "Dados Pessoais",
    contactPreferences: "Preferências de Contato",
    smsCodeLabel: "Código descrito no SMS",
    smsCodePlaceholder: "Digite o código",
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

  getCurrentLanguage(): string {
    return this.language();
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

    let result = translation || key;

    if (params) {
      Object.keys(params).forEach((paramKey) => {
        result = result.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }
    return result;
  }

  statusTranslations: Record<StatusService, { pt: string; en: string }> = {
    [StatusService.Requested]: { pt: "Solicitado", en: "Requested" },
    [StatusService.InAnalysis]: { pt: "Em análise", en: "In Analysis" },
    [StatusService.AwaitingClarifications]: {
      pt: "Aguardando esclarecimentos",
      en: "Awaiting Clarifications",
    },
    [StatusService.QuoteSent]: { pt: "Orçamento enviado", en: "Quote Sent" },
    [StatusService.AwaitingQuoteApproval]: {
      pt: "Aguardando aprovação do orçamento",
      en: "Awaiting Quote Approval",
    },
    [StatusService.QuoteApproved]: {
      pt: "Orçamento aprovado",
      en: "Quote Approved",
    },
    [StatusService.QuoteRejected]: {
      pt: "Orçamento rejeitado",
      en: "Quote Rejected",
    },
    [StatusService.AwaitingExecutionDate]: {
      pt: "Aguardando data de execução",
      en: "Awaiting Execution Date",
    },
    [StatusService.DateProposedByAdmin]: {
      pt: "Data proposta pelo administrador",
      en: "Date Proposed By Admin",
    },
    [StatusService.AwaitingDateApproval]: {
      pt: "Aguardando aprovação da data",
      en: "Awaiting Date Approval",
    },
    [StatusService.DateApprovedByClient]: {
      pt: "Data aprovada pelo cliente",
      en: "Date Approved By Client",
    },
    [StatusService.DateRejectedByClient]: {
      pt: "Data rejeitada pelo cliente",
      en: "Date Rejected By Client",
    },
    [StatusService.SearchingProfessional]: {
      pt: "Buscando profissional",
      en: "Searching Professional",
    },
    [StatusService.ProfessionalSelected]: {
      pt: "Profissional selecionado",
      en: "Professional Selected",
    },
    [StatusService.AwaitingProfessionalConfirmation]: {
      pt: "Aguardando confirmação do profissional",
      en: "Awaiting Professional Confirmation",
    },
    [StatusService.Assigned]: { pt: "Atribuído", en: "Assigned" },
    [StatusService.Pending]: { pt: "Pendente", en: "Pending" },
    [StatusService.Scheduled]: { pt: "Agendado", en: "Scheduled" },
    [StatusService.InProgress]: { pt: "Em execução", en: "In Progress" },
    [StatusService.CompletedAwaitingApproval]: {
      pt: "Concluído - Aguardando aprovação",
      en: "Completed - Awaiting Approval",
    },
    [StatusService.Completed]: { pt: "Finalizado", en: "Completed" },
    [StatusService.Cancelled]: { pt: "Cancelado", en: "Cancelled" },
  };

  translateStatus(status: StatusService): string {
    const lang = this.language(); // 'pt' ou 'en'
    return this.statusTranslations[status]?.[lang] || status;
  }
}
