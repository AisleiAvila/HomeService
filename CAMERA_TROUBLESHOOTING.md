# Guia de Solução de Problemas - Câmera do Perfil

## Funcionalidade Implementada

A funcionalidade de captura de imagem do perfil foi melhorada com:

### ✅ Melhorias Implementadas:

1. **Verificação de Permissões**: O sistema agora verifica as permissões da câmera antes de tentar acessá-la
2. **Tratamento de Erros Aprimorado**: Mensagens de erro específicas para diferentes tipos de falha
3. **Limpeza de Recursos**: Garantia de que a câmera seja liberada adequadamente
4. **Interface Melhorada**: Modal mais intuitivo com feedback visual
5. **Métodos Faltantes**: Adicionados `isSpecialtyChecked` e `onSpecialtyChange` que estavam sendo chamados no template

### 🔧 Problemas Corrigidos:

1. **Métodos em falta no componente**
2. **Tratamento inadequado de erros da câmera**
3. **Falta de verificação de permissões**
4. **Cleanup inadequado dos recursos da câmera**
5. **Mensagens de erro genéricas**

## Como Testar

### 1. Acesso Local (HTTPS necessário)

- A funcionalidade da câmera requer HTTPS para funcionar
- Para testar localmente, use: `ng serve --ssl`
- Ou acesse via `https://localhost:4200`

### 2. Passos para Testar:

1. Faça login na aplicação
2. Acesse o perfil do usuário
3. Clique no ícone da câmera sobre a foto do perfil
4. Permita o acesso à câmera quando solicitado
5. Posicione-se no quadro e clique em "Capturar"

## Possíveis Problemas e Soluções

### ❌ Problema: "Camera access is not supported"

**Causa**: Navegador não suporta getUserMedia ou não está em HTTPS
**Solução**:

- Use um navegador moderno (Chrome, Firefox, Safari, Edge)
- Certifique-se de que está acessando via HTTPS

### ❌ Problema: "Camera permission was denied"

**Causa**: Usuário negou permissão ou bloqueou no navegador
**Solução**:

- Clique no ícone de câmera na barra de endereços
- Altere as permissões para "Permitir"
- Recarregue a página

### ❌ Problema: "No camera found"

**Causa**: Dispositivo não possui câmera ou não está conectada
**Solução**:

- Verifique se o dispositivo possui câmera
- Conecte uma câmera externa se necessário
- Verifique se a câmera não está sendo usada por outro aplicativo

### ❌ Problema: "Camera is already in use"

**Causa**: Outra aplicação está usando a câmera
**Solução**:

- Feche outros aplicativos que possam estar usando a câmera
- Verifique se não há outras abas do navegador usando a câmera

## Recursos Adicionados

### Traduções

- Mensagens de erro específicas em português e inglês
- Textos da interface da câmera traduzidos

### Validações

- Verificação se o vídeo está pronto antes da captura
- Validação de formato e tamanho da imagem
- Verificação de suporte do navegador

### Experiência do Usuário

- Feedback visual durante carregamento
- Instruções claras para o usuário
- Modal responsivo e acessível

## Configuração HTTPS Local (Opcional)

Para testar localmente com HTTPS:

```bash
# Instalar certificado local (uma vez)
npm install -g mkcert
mkcert -install
mkcert localhost

# Configurar Angular CLI
ng serve --ssl --ssl-cert localhost.pem --ssl-key localhost-key.pem
```

## Logs de Debug

Para debugar problemas, abra o console do navegador (F12) e verifique:

- Erros de permissão
- Mensagens de erro da câmera
- Status das streams de vídeo

Os logs incluem informações detalhadas sobre cada etapa do processo da câmera.
