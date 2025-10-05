// Este arquivo é para Supabase Edge Functions (Deno). O import abaixo só funciona no deploy Deno.
// Para evitar erro no TypeScript local, usamos @ts-ignore.
// @ts-ignore
/// <reference lib="deno.ns" />
// Supabase Edge Function (TypeScript) - Envio de SMS via Twilio
// @ts-ignore
import { serve } from "std/server";

// @ts-ignore
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
// @ts-ignore
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
// @ts-ignore
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

async function sendSms(phone: string, code: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const body = new URLSearchParams({
    To: phone,
    From: TWILIO_PHONE_NUMBER!,
    Body: `Seu código de verificação: ${code}`,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  return res.ok;
}

serve(async (req: Request) => {
  const { phone } = await req.json();
  if (!phone)
    return new Response(JSON.stringify({ error: "Missing phone" }), {
      status: 400,
    });
  // Gera código aleatório
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  // Salvar código em cache (exemplo: Deno KV, Redis, etc.)
  // Aqui apenas simulação
  const success = await sendSms(phone, code);
  if (!success)
    return new Response(JSON.stringify({ error: "SMS failed" }), {
      status: 500,
    });
  // Retorne o código para debug (em produção, nunca envie o código para o frontend)
  return new Response(JSON.stringify({ success: true, code }), { status: 200 });
});
