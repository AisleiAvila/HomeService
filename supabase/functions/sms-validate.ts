// Supabase Edge Function (TypeScript) - Validação de código SMS
// Este arquivo é para Supabase Edge Functions (Deno). O import abaixo só funciona no deploy Deno.
// Para evitar erro no TypeScript local, usamos @ts-ignore.
// @ts-ignore
import { serve } from "std/server";

// Simulação: em produção, use Deno KV, Redis, ou Supabase DB para armazenar códigos
const codeStore: Record<string, string> = {};

// @ts-ignore
import { createClient } from "@supabase/supabase-js";

// @ts-ignore
const supabaseUrl = Deno.env.get("SUPABASE_URL");
// @ts-ignore
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// @ts-ignore
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req: Request) => {
  const { phone, code } = await req.json();
  // Log do valor recebido
  console.log("[SMS-VALIDATE] phone recebido:", phone);
  console.log("[SMS-VALIDATE] code recebido:", code);
  if (!phone || !code)
    return new Response(JSON.stringify({ error: "Missing data" }), {
      status: 400,
    });
  // Simulação: sempre aceita código 123456
  if (code === "123456") {
    // Atualiza o campo phone_verified para true
    const { data, error } = await supabase
      .from("users")
      .update({ phone_verified: true })
      .eq("phone", phone)
      .select();
    console.log("[SMS-VALIDATE] Resultado update:", data, error);
    if (error) {
      return new Response(
        JSON.stringify({ valid: true, update: false, error: error.message }),
        { status: 500 }
      );
    }
    return new Response(
      JSON.stringify({
        valid: true,
        update: true,
        updatedRows: data?.length || 0,
      }),
      {
        status: 200,
      }
    );
  }
  // Em produção, compare com o código armazenado
  // const valid = codeStore[phone] === code;
  // if (valid) {
  //   await supabase.from("users").update({ phone_verified: true }).eq("phone", phone);
  // }
  return new Response(JSON.stringify({ valid: false }), { status: 200 });
});
