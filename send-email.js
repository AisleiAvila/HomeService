// send-email.js
// Endpoint Node.js/Express para envio de e-mail via SendGrid
// Instale as dependências: npm install express @sendgrid/mail cors

const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');


const app = express();
const PORT = process.env.PORT || 4001;

// Substitua pela sua chave da SendGrid
import dotenv from 'dotenv';
dotenv.config();
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

sgMail.setApiKey(SENDGRID_API_KEY);

// CORS aberto para debug: aceita qualquer origem
app.use(cors());
app.use(express.json());

app.post('/api/send-email', async (req, res) => {
  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
  }
  try {
    await sgMail.send({
      to,
      from: FROM_EMAIL,
      subject,
      html,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    res.status(500).json({ error: 'Erro ao enviar e-mail.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de e-mail rodando na porta ${PORT}`);
});
