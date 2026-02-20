// Test script for email server
import http from 'http';

const postData = JSON.stringify({
  to: 'aislei@outlook.com.br',
  subject: 'Teste de Reset',
  html: '<p>Teste de redefinição de senha</p>'
});

const options = {
  hostname: 'localhost',
  port: 4001,
  path: '/api/send-email',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Fazendo requisição para o servidor de e-mail...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Resposta:', body);
  });
});

req.on('error', (e) => {
  console.error(`Erro na requisição: ${e.message}`);
});

req.write(postData);
req.end();