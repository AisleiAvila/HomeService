export const environment = {
  production: true,
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc",
  supabaseUrl: "https://uqrvenlkquheajuveggv.supabase.co",
  apiUrl: "https://your-backend-url.com",
  supabaseRestUrl: "https://uqrvenlkquheajuveggv.supabase.co/rest/v1",
  loginApiUrl: "/api/login",
  sessionApiUrl: "/api/session",
  superUserAccessApiUrl: "/api/super-user-access",
  tenantsApiUrl: "/api/tenants",
  billingApiUrl: "/api/billing",
  confirmEmailApiUrl: "/api/confirm-email",
  emailServiceUrl: "/api/send-email", // Em produção, usar endpoint Vercel

  // Configurações de e-mail - Brevo (substitui MailerSend)
  emailProvider: "brevo",
  brevoApiKey: "", // Será definido via variável de ambiente
  fromEmail: "", // Será definido via variável de ambiente
};

// Adiciona exportação de tipo para compatibilidade Angular
export type Environment = typeof environment;
