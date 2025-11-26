// Script para migrar senhas em texto puro para SHA256 em public.users
// Requer: node-fetch, pg
// Execute: node migrate_passwords_to_hash.js

const { createClient } = require('@supabase/supabase-js');
const crypto = require('node:crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uqrvenlkquheajuveggv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
  // Buscar todos os usuários com senha em texto puro
  const { data: users, error } = await supabase
    .from('users')
    .select('id, password')
    .not('password', 'is', null);
  if (error) {
    console.error('Erro ao buscar usuários:', error.message);
    process.exit(1);
  }
  for (const user of users) {
    const hash = crypto.createHash('sha256').update(user.password).digest('hex');
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: hash })
      .eq('id', user.id);
    if (updateError) {
      console.error(`Erro ao migrar usuário ${user.id}:`, updateError.message);
    } else {
      console.log(`Usuário ${user.id} migrado.`);
    }
  }
  console.log('Migração concluída.');
}

try {
  await migrate();
} catch (err) {
  console.error('Erro na migração:', err);
  process.exit(1);
}
