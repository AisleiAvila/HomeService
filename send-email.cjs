// ...existing code...

// ...existing code...
// send-email.cjs
// Endpoint Node.js/Express para envio de e-mail via SendGrid
// Instale as dependências: npm install express @sendgrid/mail cors

const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');

const app = express();
const PORT = process.env.PORT || 4001;

// Substitua pela sua chave da SendGrid
require('dotenv').config({ path: './.env' });


const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

// Log para depuração: mostra início e tamanho da chave usada
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY);
console.log('FROM_EMAIL:', process.env.FROM_EMAIL);

// Diagnóstico: logar variáveis de ambiente (parcialmente mascarado)
if (SENDGRID_API_KEY) {
  console.log('SENDGRID_API_KEY começa com:', SENDGRID_API_KEY.substring(0, 10), '... (tamanho:', SENDGRID_API_KEY.length, ')');
} else {
  console.error('ERRO: SENDGRID_API_KEY não definida!');
}
if (FROM_EMAIL) {
  console.log('FROM_EMAIL:', FROM_EMAIL);
} else {
  console.error('ERRO: FROM_EMAIL não definida!');
}

sgMail.setApiKey(SENDGRID_API_KEY);

// CORS explícito para frontend Angular local e Vercel (função para múltiplos domínios)
const allowedOrigins = new Set([
  'http://localhost:4200',
  'https://natan-general-service.vercel.app',
  'http://localhost:4001/api/send-email',
  'http://localhost:4002'
]);
app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (ex: ferramentas locais, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

app.post('/api/send-email', async (req, res) => {
  console.log('Query recebida: ', req.query)
  console.log('Corpo recebido:', req.body);
  console.log('Detalhe dos parâmetros recebidos:');
  console.log('to:', req.body.to, typeof req.body.to);
  console.log('subject:', req.body.subject, typeof req.body.subject);
  console.log('html:', req.body.html, typeof req.body.html);
  console.log('token:', req.body.token, typeof req.body.token);
  const { to, subject, html, token, tempPassword } = req.body;
  console.log('tempPassword recebido:', tempPassword, typeof tempPassword);
  
  // Validação mínima - permitir envio sem token para reset de senha
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes (to, subject, html).' });
  }
  
  try {
    // Se houver token, é um email de confirmação de cadastro
    if (token) {
      // Sempre use o domínio Vercel para o link de confirmação
      const baseUrl = 'https://natan-general-service.vercel.app';
      // O campo 'to' é o e-mail do usuário
      const confirmLink = `${baseUrl}/confirmar-email?email=${encodeURIComponent(to)}&token=${encodeURIComponent(token)}`;
      // Corpo do e-mail com senha temporária e instrução clara
      const htmlWithLink = `<p>Olá,</p>
        <p>Seu cadastro como profissional foi realizado com sucesso.<br>
        <b>Sua senha temporária para o primeiro acesso é:</b><br>
        <span style='font-size:1.2em;color:#1e293b;background:#f1f5f9;padding:4px 12px;border-radius:6px;'>${tempPassword}</span></p>
        <p>Por favor, confirme seu e-mail clicando no botão abaixo:</p><br>
        <a href='${confirmLink}' style='display:inline-block;padding:12px 24px;background:#22c55e;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;'>Confirmar cadastro</a><br><br>
        Ou copie e cole este link no navegador:<br><span style='word-break:break-all;'>${confirmLink}</span>`;
      
      await sgMail.send({
        to,
        from: FROM_EMAIL,
        subject,
        html: htmlWithLink,
      });
    } else {
      // Email genérico (reset de senha, etc) - usar HTML direto do body
      await sgMail.send({
        to,
        from: FROM_EMAIL,
        subject,
        html,
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    if (error.response && error.response.body) {
      console.error('Detalhe do erro:', error.response.body);
    }
    res.status(500).json({ error: 'Erro ao enviar e-mail.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de e-mail rodando na porta ${PORT}`);
});
