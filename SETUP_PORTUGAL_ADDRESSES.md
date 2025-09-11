# Sistema de Endereços de Portugal - Supabase

Este conjunto de scripts permite importar e trabalhar com dados completos de endereços de Portugal no Supabase, incluindo distritos, concelhos e códigos postais.

## 📁 Estrutura dos Arquivos

### Scripts SQL (pasta `sql/`)

- `00_run_all.sql` - Script master que executa todos os outros em ordem
- `01_create_tables_portugal_addresses.sql` - Criação das tabelas
- `02_create_indexes_portugal_addresses.sql` - Criação de índices para otimização
- `03_insert_distritos.sql` - Inserção dos dados dos distritos
- `04_insert_concelhos.sql` - Inserção dos dados dos concelhos
- `05_insert_codigos_postais.sql` - Template para inserção dos códigos postais
- `06_configure_rls_policies.sql` - Configuração de Row Level Security
- `07_create_functions_views.sql` - Funções úteis e views

### Scripts PowerShell (pasta `scripts/`)

- `import_portugal_addresses.ps1` - Script automatizado para importação completa

### Arquivos CSV Necessários

- `distritos.csv` - Dados dos distritos portugueses
- `concelhos.csv` - Dados dos concelhos/municípios
- `codigos_postais.csv` - Dados detalhados dos códigos postais

## 🗃️ Estrutura das Tabelas

### `distritos`

- `cod_distrito` (PK) - Código do distrito (01-49)
- `nome_distrito` - Nome do distrito
- `created_at`, `updated_at` - Timestamps

### `concelhos`

- `cod_distrito`, `cod_concelho` (PK composta) - Códigos identificadores
- `nome_concelho` - Nome do concelho
- `created_at`, `updated_at` - Timestamps
- FK para `distritos`

### `codigos_postais`

- `id` (PK) - ID sequencial
- `cod_distrito`, `cod_concelho` (FK) - Referências
- `cod_localidade`, `nome_localidade` - Dados da localidade
- `cod_arteria`, `tipo_arteria`, `nome_arteria` - Dados da rua/artéria
- `num_cod_postal`, `ext_cod_postal` - Código postal (XXXX-XXX)
- `codigo_postal_completo` - Campo calculado (XXXX-XXX)
- `desig_postal` - Designação postal
- Vários outros campos para endereços detalhados

## 🚀 Como Usar

### Opção 1: Script Automatizado (Recomendado)

```powershell
# Execute no PowerShell
.\scripts\import_portugal_addresses.ps1 -SupabaseUrl "https://seuproject.supabase.co" -SupabasePassword "sua_senha"
```

### Opção 2: Execução Manual

1. **Configure a conexão com o Supabase:**

```bash
# Defina as variáveis de ambiente
$env:PGPASSWORD = "sua_senha_supabase"
$HOST = "seuproject.supabase.co"
$PORT = "5432"
$USER = "postgres"
$DATABASE = "postgres"
```

2. **Execute o script master:**

```bash
psql -h $HOST -p $PORT -U $USER -d $DATABASE -f sql/00_run_all.sql
```

3. **Importe os códigos postais:**

```bash
# Usando COPY (mais rápido)
psql -h $HOST -p $PORT -U $USER -d $DATABASE -c "\COPY codigos_postais (cod_distrito, cod_concelho, cod_localidade, nome_localidade, cod_arteria, tipo_arteria, prep1, titulo_arteria, prep2, nome_arteria, local_arteria, troco, porta, cliente, num_cod_postal, ext_cod_postal, desig_postal) FROM 'caminho/para/codigos_postais.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',', ENCODING 'UTF8');"
```

### Opção 3: Via Interface do Supabase

1. Abra o SQL Editor no dashboard do Supabase
2. Execute cada script na ordem numerada (01, 02, 03, etc.)
3. Para os códigos postais, use a funcionalidade de importação CSV

## 🔧 Funções Disponíveis

### `buscar_por_codigo_postal(codigo_postal_input TEXT)`

Busca endereços por código postal completo.

```sql
SELECT * FROM buscar_por_codigo_postal('1000-001');
```

### `buscar_por_localidade(localidade_input TEXT)`

Busca códigos postais por localidade.

```sql
SELECT * FROM buscar_por_localidade('Lisboa');
```

### `buscar_por_distrito_concelho(distrito_input TEXT, concelho_input TEXT)`

Busca por distrito e concelho.

```sql
SELECT * FROM buscar_por_distrito_concelho('Lisboa', 'Lisboa');
```

### `validar_codigo_postal(codigo_postal_input TEXT)`

Valida se um código postal existe.

```sql
SELECT validar_codigo_postal('1000-001');
```

### `buscar_endereco_texto(texto_busca TEXT)`

Busca de texto completo com ranking.

```sql
SELECT * FROM buscar_endereco_texto('Rua Augusta Lisboa');
```

## 📊 Views Disponíveis

### `vw_enderecos_completos`

View simplificada com endereços formatados.

```sql
SELECT * FROM vw_enderecos_completos WHERE distrito = 'Lisboa' LIMIT 10;
```

## 🔐 Segurança (RLS)

As tabelas têm Row Level Security configurado:

- **Leitura pública**: Todos podem consultar os dados (dados geográficos públicos)
- **Escrita restrita**: Apenas `service_role` pode modificar dados
- **Usuários autenticados**: Podem ter permissões adicionais (configurável)

## 🎯 Exemplos de Consultas

```sql
-- Buscar todos os códigos postais de Lisboa
SELECT * FROM vw_enderecos_completos
WHERE distrito = 'Lisboa' AND concelho = 'Lisboa';

-- Validar múltiplos códigos postais
SELECT
    codigo_postal,
    validar_codigo_postal(codigo_postal) as valido
FROM (VALUES
    ('1000-001'),
    ('2000-002'),
    ('9999-999')
) AS t(codigo_postal);

-- Buscar ruas com nome específico
SELECT DISTINCT arteria_completa, codigo_postal, localidade
FROM vw_enderecos_completos
WHERE arteria_completa ILIKE '%augusta%'
ORDER BY distrito, concelho;

-- Estatísticas por distrito
SELECT
    distrito,
    COUNT(DISTINCT concelho) as total_concelhos,
    COUNT(DISTINCT codigo_postal) as total_codigos_postais
FROM vw_enderecos_completos
GROUP BY distrito
ORDER BY total_codigos_postais DESC;
```

## 📈 Performance

Os scripts incluem:

- Índices otimizados para consultas frequentes
- Índices de texto completo para buscas
- Constraints para validação de dados
- Triggers para timestamps automáticos

## ⚠️ Requisitos

- PostgreSQL 12+ (Supabase)
- Arquivos CSV com dados de Portugal
- Acesso ao psql ou interface SQL do Supabase
- PowerShell (para script automatizado)

## 🐛 Troubleshooting

### Erro de encoding

Se houver problemas com caracteres especiais:

```sql
SET client_encoding = 'UTF8';
```

### Erro de memória na importação

Para arquivos muito grandes:

```sql
-- Aumentar work_mem temporariamente
SET work_mem = '256MB';
```

### Verificar importação

```sql
-- Verificar totais
SELECT
    COUNT(*) as total_distritos FROM distritos;
SELECT
    COUNT(*) as total_concelhos FROM concelhos;
SELECT
    COUNT(*) as total_codigos_postais FROM codigos_postais;

-- Verificar exemplos
SELECT * FROM vw_enderecos_completos LIMIT 5;
```

## 🤝 Contribuições

Para melhorias ou correções:

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Faça commit das mudanças
4. Abra um Pull Request

## 📄 Licença

Os dados geográficos de Portugal são de domínio público. Este projeto é distribuído sob licença MIT.
