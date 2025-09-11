# 📋 Sistema de Logs para Validação de Códigos Postais

## 🔍 Logs Implementados

Foi adicionado um sistema completo de logs no console para rastrear toda a atividade relacionada à validação e busca de códigos postais portugueses no formulário Service Request.

## 📊 Categorias de Logs

### 🚀 **[FORM]** - Inicialização do Componente

```
🚀 [FORM] Service Request Form Component inicializado
```

- **Quando**: Componente é criado
- **Propósito**: Confirmar que o componente foi inicializado

### 🔍 **[POSTAL CODE]** - Validação de Código Postal

```
🔍 [POSTAL CODE] Usuário digitou: 1000001
✏️ [POSTAL CODE] Código formatado: 1000-001
✅ [POSTAL CODE] Formato válido, iniciando validação completa...
📊 [POSTAL CODE] Resultado da validação: {isValid: true, locality: "Lisboa", ...}
🎯 [POSTAL CODE] Dados encontrados: {localidade: "Lisboa", distrito: "Lisboa", concelho: "Lisboa"}
🏛️ [POSTAL CODE] Carregando concelhos para distrito: Lisboa
```

- **Quando**: Utilizador digita/altera código postal
- **Propósito**: Rastrear todo o processo de validação desde input até resultado

### 💾 **[FALLBACK]** - Sistema de Fallback Offline

```
⚠️ [POSTAL CODE] Validação falhou, usando fallback offline
💾 [FALLBACK] Tentando validação offline para: 1000-001
✅ [FALLBACK] Dados encontrados offline: {city: "Lisboa", state: "Lisboa", ...}
🏛️ [FALLBACK] Carregando concelhos para distrito: Lisboa
```

- **Quando**: Base de dados principal falha, usa sistema offline
- **Propósito**: Monitorar funcionamento do sistema de backup

### 🏛️ **[DISTRICTS]** - Carregamento de Distritos

```
🏛️ [DISTRICTS] Carregando distritos portugueses...
✅ [DISTRICTS] 18 distritos carregados: ["Aveiro", "Beja", "Braga", ...]
```

- **Quando**: Componente carrega lista de distritos
- **Propósito**: Verificar se dados de distritos foram carregados corretamente

### 🏛️ **[CONCELHOS]** - Carregamento de Concelhos

```
🏛️ [CONCELHOS] Carregando concelhos para distrito: Lisboa
✅ [CONCELHOS] 16 concelhos carregados para Lisboa: ["Alenquer", "Arruda dos Vinhos", ...]
🏛️ [CONCELHOS] Carregamento finalizado
```

- **Quando**: Utilizador seleciona distrito ou código postal define distrito automaticamente
- **Propósito**: Monitorar carregamento dinâmico de concelhos

### 🏠 **[ADDRESS]** - Atualização de Campos de Endereço

```
🏠 [ADDRESS] Campo 'state' atualizado para: Porto
🏛️ [ADDRESS] Distrito alterado, carregando concelhos...
🧹 [ADDRESS] Concelho limpo devido à mudança de distrito
```

- **Quando**: Utilizador altera campos do endereço manualmente
- **Propósito**: Rastrear mudanças manuais vs. automáticas

## 🎯 Como Usar os Logs

### 1. **Abrir Console do Navegador**

- F12 → Console
- Ou Ctrl+Shift+I → Console

### 2. **Testar Funcionalidades**

1. **Digite código postal**: `1000-001`
2. **Selecione distrito**: Escolher manualmente
3. **Observe logs em tempo real**

### 3. **Cenários de Teste**

#### ✅ **Cenário Normal (Base de Dados Funcionando)**

```
🔍 [POSTAL CODE] Usuário digitou: 1000-001
✏️ [POSTAL CODE] Código formatado: 1000-001
✅ [POSTAL CODE] Formato válido, iniciando validação completa...
📊 [POSTAL CODE] Resultado da validação: {isValid: true, locality: "Lisboa", district: "Lisboa", municipality: "Lisboa"}
🎯 [POSTAL CODE] Dados encontrados: {localidade: "Lisboa", distrito: "Lisboa", concelho: "Lisboa"}
🏛️ [POSTAL CODE] Carregando concelhos para distrito: Lisboa
🏛️ [CONCELHOS] Carregando concelhos para distrito: Lisboa
✅ [CONCELHOS] 16 concelhos carregados para Lisboa: (16) ["Alenquer", "Arruda dos Vinhos", ...]
🏛️ [CONCELHOS] Carregamento finalizado
```

#### ⚠️ **Cenário Fallback (Base de Dados Indisponível)**

```
🔍 [POSTAL CODE] Usuário digitou: 1000-001
✏️ [POSTAL CODE] Código formatado: 1000-001
✅ [POSTAL CODE] Formato válido, iniciando validação completa...
❌ [POSTAL CODE] Erro na validação, usando fallback offline: Error: Network failed
💾 [FALLBACK] Tentando validação offline para: 1000-001
✅ [FALLBACK] Dados encontrados offline: {city: "Lisboa", state: "Lisboa", concelho: "Lisboa"}
🏛️ [FALLBACK] Carregando concelhos para distrito: Lisboa
```

#### ❌ **Cenário Erro (Código Postal Inválido)**

```
🔍 [POSTAL CODE] Usuário digitou: 9999-999
✏️ [POSTAL CODE] Código formatado: 9999-999
✅ [POSTAL CODE] Formato válido, iniciando validação completa...
📊 [POSTAL CODE] Resultado da validação: {isValid: false, error: "Código postal não encontrado"}
⚠️ [POSTAL CODE] Validação falhou, usando fallback offline
💾 [FALLBACK] Tentando validação offline para: 9999-999
❌ [FALLBACK] Nenhum dado encontrado offline para: 9999-999
```

## 🔧 Benefícios do Sistema de Logs

### Para Desenvolvimento

- ✅ **Debug em tempo real**: Ver exatamente o que acontece
- ✅ **Rastreamento de erros**: Identificar onde falhas ocorrem
- ✅ **Performance**: Monitorar tempos de carregamento
- ✅ **Validação**: Confirmar funcionamento correto

### Para Produção

- ✅ **Monitoramento**: Acompanhar uso real
- ✅ **Diagnóstico**: Resolver problemas dos utilizadores
- ✅ **Métricas**: Entender padrões de uso
- ✅ **Qualidade**: Garantir sistema funcionando

## 🎨 Formato dos Logs

### Emojis para Identificação Rápida

- 🔍 = Busca/Pesquisa
- ✏️ = Formatação
- ✅ = Sucesso
- ❌ = Erro
- ⚠️ = Aviso/Fallback
- 💾 = Sistema Offline
- 🏛️ = Distritos/Concelhos
- 🏠 = Endereço
- 🎯 = Dados Encontrados
- 🧹 = Limpeza/Reset

### Estrutura dos Logs

```
[EMOJI] [CATEGORIA] Descrição: dados
```

## 📱 Como Desativar Logs (Produção)

Para produção, pode criar uma variável de ambiente:

```typescript
const ENABLE_LOGS = environment.production ? false : true;

private log(message: string, ...args: any[]) {
  if (ENABLE_LOGS) {
    console.log(message, ...args);
  }
}
```

## 🎯 Resultado

Agora toda a atividade de validação de códigos postais fica completamente rastreada no console, permitindo debug fácil e monitoramento do sistema de endereços portugueses!
