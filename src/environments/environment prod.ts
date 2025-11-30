export const environment = {
  production: true,
  supabaseAnonKey: "SUA_CHAVE",
  supabaseUrl: "https://uqrvenlkquheajuveggv.supabase.co",
  apiUrl: "https://your-backend-url.com",
  supabaseRestUrl: "https://uqrvenlkquheajuveggv.supabase.co/rest/v1",
  loginApiUrl: "https://home-service-nu.vercel.app/api/login",
  confirmEmailApiUrl: "https://home-service-nu.vercel.app/api/confirm-email",
};

// Adiciona exportação de tipo para compatibilidade Angular
export type Environment = typeof environment;
