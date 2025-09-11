# Integração das Tabelas de Endereços Portugueses

## Estado Atual

### ✅ Concluído

- Tabelas criadas no Supabase: `distritos`, `concelhos`, `codigos_postais`
- Scripts SQL completos (01-17)
- Estrutura de dados completa de Portugal
- Índices e otimizações implementadas
- RLS policies configuradas

### ⚠️ Pendente

- **Duplicatas na tabela `codigos_postais`** - executar script de limpeza
- **Integração com a aplicação** - substituir sistema atual

## Sistema Atual vs. Novo Sistema

### Sistema Atual (portugal-address-validation.service.ts)

```typescript
// Utiliza API externa + dados mock
validatePostalCodeWithApi(postalCode: string): Observable<ValidationResult>
getPostalCodeInfoOffline(postalCode: string): Promise<PostalCodeInfo>
```

### Sistema Novo (a implementar)

```typescript
// Utilizará tabelas Supabase
async getDistritoById(id: number): Promise<Distrito>
async getConcelhosByDistrito(distritoId: number): Promise<Concelho[]>
async getCodigoPostalInfo(codigo: string): Promise<CodigoPostal>
async validateCodigoPostal(codigo: string): Promise<ValidationResult>
```

## Plano de Integração

### 1. Primeiro: Limpeza de Duplicatas

Executar um dos scripts de limpeza da pasta `sql/`:

- **Recomendado**: `15-cleanup-duplicates-step-by-step.sql`
- Alternativa: `17-final-cleanup-approach.sql`

### 2. Criar Novo Serviço de Integração

```typescript
// src/services/portugal-address-database.service.ts
@Injectable({
  providedIn: "root",
})
export class PortugalAddressDatabaseService {
  // Consultas diretas às tabelas Supabase
  // Substituirá dados mock e API externa
}
```

### 3. Atualizar PortugalAddressValidationService

- Manter interface atual para compatibilidade
- Substituir implementação interna para usar novo serviço de base de dados
- Manter fallback para casos offline

### 4. Testar Integração

- Verificar se todas as validações funcionam
- Comparar performance com sistema atual
- Validar dados retornados

## Próximos Passos

1. **Executar limpeza de duplicatas** na tabela `codigos_postais`
2. **Criar serviço de integração** com as novas tabelas
3. **Modificar sistema existente** para usar dados da base de dados
4. **Testar funcionamento** completo
5. **Remover dependências** da API externa (opcional)

## Benefícios da Integração

- ✅ **Dados completos** de Portugal (mais de 150,000 códigos postais)
- ✅ **Performance melhorada** (sem chamadas API externas)
- ✅ **Funcionamento offline** completo
- ✅ **Controlo total** dos dados
- ✅ **Consistência** com o resto da aplicação Supabase
