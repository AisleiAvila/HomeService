export const environment = {
  production: false,
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc",
  supabaseUrl: "https://" + "uqrvenlkquheajuveggv.supabase.co",
  apiUrl: "https://your-backend-url.com", // Altere para o endpoint real do backend/Supabase Function
  supabaseRestUrl: "https://uqrvenlkquheajuveggv.supabase.co/rest/v1",
};

// Adiciona exportação de tipo para compatibilidade Angular
export type Environment = typeof environment;
