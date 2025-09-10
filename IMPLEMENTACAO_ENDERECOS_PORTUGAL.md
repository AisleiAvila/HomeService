# 📍 Implementação de Endereços para Portugal - HomeService

## 🎯 **Resumo da Implementação**

Este documento descreve as modificações realizadas para adaptar o sistema de endereços da aplicação HomeService para o contexto português, permitindo que clientes cadastrem dados de endereço onde os serviços serão realizados.

## 🔧 **Modificações Realizadas**

### **1. Modelo de Dados Atualizado**

**Arquivo:** `src/models/maintenance.models.ts`

```typescript
export interface Address {
  street: string; // Rua/Avenida completa
  city: string; // Localidade (ex: Lisboa, Porto)
  state: string; // Distrito (ex: Lisboa, Porto, Coimbra)
  zip_code: string; // Código Postal (formato: XXXX-XXX)
  freguesia?: string; // Freguesia (opcional para Portugal)
  concelho?: string; // Concelho (opcional para Portugal)
}
```

### **2. Serviço de Validação Português**

**Arquivo:** `src/services/portugal-address-validation.service.ts`

**Funcionalidades:**

- ✅ Validação de código postal português (XXXX-XXX)
- ✅ Formatação automática de códigos postais
- ✅ Lista de distritos portugueses
- ✅ Validação de distritos
- ✅ Simulação de API de códigos postais (preparado para integração real)

### **3. Autocomplete de Endereços Atualizado**

**Arquivo:** `src/services/address-autocomplete.service.ts`

**Funcionalidades:**

- ✅ Sugestões de endereços portugueses
- ✅ Busca por código postal
- ✅ Dados de exemplo para demonstração
- ✅ Preparado para integração com APIs reais (CTT, Google Places)

### **4. Formulário Adaptado para Portugal**

**Arquivo:** `src/components/service-request-form/service-request-form.component.ts`

**Melhorias:**

- ✅ Campos específicos para Portugal (Distrito, Concelho, Freguesia)
- ✅ Validação em tempo real do código postal
- ✅ Auto-preenchimento baseado no código postal
- ✅ Dropdown com distritos portugueses
- ✅ Interface traduzida (Português/Inglês)

### **5. Schema da Base de Dados**

**Arquivo:** `database-portugal-addresses.sql`

**Modificações na base de dados:**

- ✅ Novos campos na tabela `service_requests`: `freguesia`, `concelho`
- ✅ Novos campos na tabela `users` para endereço padrão
- ✅ Função de validação de código postal em SQL
- ✅ Constraints de validação
- ✅ Índices para performance
- ✅ Dados de exemplo portugueses

### **6. Internacionalização**

**Arquivo:** `src/i18n.service.ts`

**Traduções adicionadas:**

- ✅ `streetAddress`: "Morada Completa" / "Complete Address"
- ✅ `postalCode`: "Código Postal" / "Postal Code"
- ✅ `locality`: "Localidade" / "Locality"
- ✅ `district`: "Distrito" / "District"
- ✅ `concelho`: "Concelho" / "Municipality"
- ✅ Mensagens de validação e placeholders

## 🚀 **Como Usar**

### **1. Executar o Script SQL**

```sql
-- Execute no painel SQL do Supabase
\i database-portugal-addresses.sql
```

### **2. Como Cliente Cadastra Endereço**

1. **Cliente acessa** a aplicação
2. **Clica em** "Nova Solicitação de Serviço"
3. **Preenche dados** do serviço (título, descrição, categoria)
4. **Cadastra endereço:**
   - Digita a morada completa
   - Seleciona sugestões do autocomplete (opcional)
   - Insere código postal (formato automático: XXXX-XXX)
   - Sistema auto-preenche localidade e distrito
   - Seleciona distrito manualmente se necessário
   - Preenche concelho (opcional)
5. **Submete** a solicitação

### **3. Fluxo de Dados**

```
1. Cliente preenche formulário
   ↓
2. Validação em tempo real (código postal, distrito)
   ↓
3. Auto-preenchimento via código postal
   ↓
4. Dados enviados para ServiceRequestPayload
   ↓
5. Armazenamento na tabela service_requests
   ↓
6. Profissionais visualizam endereço completo
```

## 🔍 **Validações Implementadas**

### **Frontend (Angular):**

- ✅ Formato do código postal (XXXX-XXX)
- ✅ Campos obrigatórios
- ✅ Distrito válido (da lista de distritos portugueses)
- ✅ Formatação automática do código postal

### **Backend (Supabase):**

- ✅ Constraint SQL para código postal válido
- ✅ Função `validate_portuguese_postal_code()`
- ✅ Índices para performance de busca

## 🛠 **Integrações Futuras Recomendadas**

### **1. API dos CTT**

```typescript
// Integração com API oficial dos Correios de Portugal
async getPostalCodeInfo(postalCode: string) {
  const response = await fetch(`https://api.ctt.pt/postal-codes/${postalCode}`);
  return response.json();
}
```

### **2. Google Places API**

```typescript
// Para autocomplete avançado de endereços
const autocompleteService = new google.maps.places.AutocompleteService();
autocompleteService.getPlacePredictions(
  {
    input: query,
    componentRestrictions: { country: "PT" },
  },
  callback
);
```

### **3. Mapbox Geocoding**

```typescript
// Alternativa ao Google Places
const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?country=PT&access_token=${token}`;
```

## 📊 **Estrutura da Base de Dados**

### **Tabela `service_requests`:**

```sql
street TEXT         -- "Rua Augusta, 123, 2º Esq"
city TEXT          -- "Lisboa"
state TEXT         -- "Lisboa"
zip_code TEXT      -- "1100-048"
freguesia TEXT     -- "Santa Maria Maior"
concelho TEXT      -- "Lisboa"
```

### **Tabela `users` (endereço padrão):**

```sql
address_street TEXT      -- Endereço padrão do cliente
address_city TEXT       -- Para reutilização em formulários
address_state TEXT      --
address_zip_code TEXT   --
address_freguesia TEXT  --
address_concelho TEXT   --
```

## ✅ **Resultados Esperados**

### **Para o Cliente:**

- 🎯 Interface intuitiva para cadastro de endereços
- 🎯 Auto-preenchimento baseado em código postal
- 🎯 Validação em tempo real
- 🎯 Sugestões de endereços durante digitação

### **Para o Profissional:**

- 🎯 Visualização completa do endereço do serviço
- 🎯 Informações estruturadas (distrito, concelho, freguesia)
- 🎯 Dados padronizados para Portugal

### **Para o Administrador:**

- 🎯 Dados de endereço estruturados na base de dados
- 🎯 Relatórios por região/distrito
- 🎯 Validação de dados garantida

## 🧪 **Como Testar**

### **1. Teste de Cadastro de Endereço:**

```
1. Acesse a aplicação como cliente
2. Crie nova solicitação de serviço
3. Digite "Rua Augusta" no campo endereço
4. Verifique se aparecem sugestões
5. Insira código postal "1100048"
6. Verifique auto-formatação para "1100-048"
7. Confirme auto-preenchimento de Lisboa/Lisboa
8. Submeta o formulário
9. Verifique dados na base: service_requests table
```

### **2. Teste de Validação:**

```
1. Digite código postal inválido: "123"
2. Verifique mensagem de erro vermelha
3. Digite código válido: "1100-048"
4. Verifique que erro desaparece
5. Tente submeter sem distrito selecionado
6. Verifique que formulário não é submetido
```

## 🔧 **Manutenção e Suporte**

### **Logs importantes:**

- Validação de código postal no console
- Erros de autocomplete
- Dados de endereço submetidos

### **Monitoramento:**

- Performance de queries de endereço
- Uso do autocomplete
- Erros de validação mais comuns

### **Atualizações futuras:**

- Integração com APIs oficiais
- Melhorias no autocomplete
- Suporte a endereços rurais específicos
- Integração com mapas interativos

---

**✅ Implementação concluída e pronta para uso!**
