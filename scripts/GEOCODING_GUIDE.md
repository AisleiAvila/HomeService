# 🌍 Geocodificação de Códigos Postais Portugueses

Este documento explica como obter latitude e longitude para todos os códigos postais de Portugal armazenados na base de dados.

## 📋 Requisitos

Antes de executar qualquer script, certifique-se de que:

1. ✅ As colunas `latitude` e `longitude` foram adicionadas à tabela `codigos_postais`
2. ✅ As variáveis de ambiente estão configuradas:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Adicionar Colunas (se ainda não foi feito)

Execute o script SQL:

```bash
psql -h seu-host -d sua-database -f scripts/add_latitude_longitude_to_codigos_postais.sql
```

Ou execute diretamente no Supabase Dashboard → SQL Editor.

---

## 🚀 Opções de Geocodificação

### Opção 1: Dataset Público (RECOMENDADO) ⚡

**Vantagens:**

- ✅ MUITO mais rápido (minutos vs horas)
- ✅ Gratuito
- ✅ Maior precisão
- ✅ Não depende de APIs externas

**Passos:**

1. **Baixe um dataset público com coordenadas:**

   ⚠️ **IMPORTANTE:** A maioria dos datasets públicos de códigos postais portugueses **NÃO inclui coordenadas**.

   **Opções disponíveis:**

   - **GeoNames Portugal** (Recomendado - TEM coordenadas)

     ```
     https://download.geonames.org/export/zip/
     Baixe: PT.zip
     ```

     Colunas: country code, postal code, place name, admin name1-3, latitude, longitude, accuracy

   - **OpenAddresses** (Pode ter coordenadas parciais)

     ```
     https://batch.openaddresses.io/data
     Busque por "portugal" → Baixe o arquivo
     ```

     Formato: CSV com lat, lon, street, city, postcode

   - **Criar seu próprio dataset:**
     ```
     Use o script Nominatim fornecido neste guia.
     Execução automática processa todos os códigos.
     Tempo: ~7-8 horas para 26.000 códigos
     ```

2. **Prepare o arquivo CSV:**

   **Se usar GeoNames (PT.zip):**

   - Extraia o arquivo PT.txt
   - Formato: Tab-separated (TSV)
   - Colunas relevantes: postal code (coluna 2), latitude (coluna 10), longitude (coluna 11)

   **Se usar OpenAddresses:**

   - Já vem em formato CSV pronto
   - Colunas: lat, lon, postcode

   **Formato esperado pelo script:**

   ```csv
   codigo_postal,latitude,longitude
   1000-001,38.7139,-9.1394
   1000-002,38.7141,-9.1396
   ...
   ```

   **Converter GeoNames para formato correto:**

   ```powershell
   # Exemplo: Converter PT.txt para CSV
   Import-Csv -Path "PT.txt" -Delimiter "`t" -Header @("country","postal_code","place","admin1","admin1_code","admin2","admin2_code","admin3","admin3_code","latitude","longitude","accuracy") |
   Select-Object @{N='codigo_postal';E={$_.postal_code}}, latitude, longitude |
   Export-Csv -Path "codigos_postais_coords.csv" -NoTypeInformation
   ```

3. **Execute o script de importação:**

   **PowerShell:**

   ```powershell
   cd scripts
   .\import_postal_codes_coordinates.ps1 -CsvFilePath ".\seu_arquivo.csv"
   ```

   **Resultado esperado:** ~26.000 códigos atualizados em poucos minutos

---

### Opção 2: API Nominatim (OpenStreetMap) 🌐

**Vantagens:**

- ✅ Gratuito
- ✅ Não precisa de API key
- ✅ Boa cobertura de Portugal

**Desvantagens:**

- ⚠️ LENTO (1 requisição/segundo)
- ⚠️ Para 26.000 códigos = ~7-8 horas

**Execução:**

**PowerShell:**

```powershell
cd scripts
.\geocode_portugal_postal_codes.ps1 -BatchSize 100
```

**Node.js:**

```bash
cd scripts
node geocode-postal-codes.cjs
```

**Processar em lotes:**

```powershell
# Processar primeiros 100
.\geocode_portugal_postal_codes.ps1 -BatchSize 100 -StartOffset 0

# Processar próximos 100
.\geocode_portugal_postal_codes.ps1 -BatchSize 100 -StartOffset 100

# E assim por diante...
```

---

### Opção 3: Google Geocoding API 💰

**Vantagens:**

- ✅ Muito preciso
- ✅ Rápido (50 req/seg)

**Desvantagens:**

- ❌ PAGO após 40.000 requisições/mês gratuitas
- ❌ Requer API Key

**Custo estimado:**

- Primeiras 40.000: GRÁTIS
- Depois: $5 por 1.000 requisições
- Para 26.000 códigos: ~$0 (dentro do free tier)

**Como usar:**

1. Obtenha API Key no [Google Cloud Console](https://console.cloud.google.com/)
2. Ative a "Geocoding API"
3. Modifique o script para usar Google:

```javascript
// No arquivo geocode-postal-codes.cjs
const GOOGLE_API_KEY = "sua-api-key";

async function geocode(postalCode, locality, district) {
  const address = `${postalCode}, ${locality}, ${district}, Portugal`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${GOOGLE_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.results && data.results.length > 0) {
    return {
      latitude: data.results[0].geometry.location.lat,
      longitude: data.results[0].geometry.location.lng,
      success: true,
    };
  }
  return { success: false };
}
```

---

## 📊 Verificar Progresso

### SQL Query - Verificar quantos têm coordenadas:

```sql
-- Total de códigos postais
SELECT COUNT(*) as total FROM codigos_postais;

-- Com coordenadas
SELECT COUNT(*) as com_coordenadas
FROM codigos_postais
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Sem coordenadas
SELECT COUNT(*) as sem_coordenadas
FROM codigos_postais
WHERE latitude IS NULL OR longitude IS NULL;

-- Percentual completo
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as com_coordenadas,
  ROUND(100.0 * COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) / COUNT(*), 2) as percentual
FROM codigos_postais;
```

### Via Supabase REST API:

```powershell
# PowerShell
$url = "$env:VITE_SUPABASE_URL/rest/v1/codigos_postais?select=count&latitude=not.is.null"
$headers = @{ "apikey" = $env:VITE_SUPABASE_ANON_KEY }
Invoke-RestMethod -Uri $url -Headers $headers
```

---

## 🎯 Recomendação

**Para 26.000+ códigos postais:**

1. **MELHOR:** Use GeoNames PT.zip (Opção 1)

   - Gratuito e confiável
   - Baixe (2MB) → Converta → Importe → Pronto em minutos
   - Já tem coordenadas para todos os códigos postais de Portugal

2. **ALTERNATIVA GRATUITA:** Use Nominatim (Opção 2)

   - Execute o script e deixe processar automaticamente
   - Tempo: ~7-8 horas para completar tudo
   - Sem custos, 100% gratuito

3. **SE TIVER BUDGET:** Google Geocoding API (Opção 3)
   - Mais preciso
   - Completa em ~10 minutos
   - Free tier: primeiras 40.000 requisições grátis

---

## 🔧 Troubleshooting

### Erro: "Variáveis de ambiente não encontradas"

**Solução:**

```powershell
# Configure no PowerShell
$env:VITE_SUPABASE_URL = "https://seu-projeto.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "sua-key-aqui"

# Ou crie um arquivo .env na raiz do projeto
```

### Erro: "429 Too Many Requests" (Nominatim)

**Solução:** Aumente o delay no script:

```javascript
const DELAY_MS = 2000; // 2 segundos em vez de 1.1
```

### Muitos códigos sem resultado

**Possíveis causas:**

- Códigos postais muito específicos (ex: edifícios individuais)
- Formato incorreto
- Localidade não reconhecida

**Solução:** Use o dataset público que já tem coordenadas aproximadas para cada código.

---

## 📈 Performance Esperada

| Método      | Velocidade | Tempo (26.000 códigos) | Custo  |
| ----------- | ---------- | ---------------------- | ------ |
| Dataset CSV | ~1000/min  | 26 minutos             | GRÁTIS |
| Nominatim   | 60/min     | 7-8 horas              | GRÁTIS |
| Google API  | 3000/min   | 10 minutos             | $0-$5  |

---

## 🎉 Após Geocodificar

Depois de popular as coordenadas:

1. ✅ O formulário de pedidos mostrará o mapa automaticamente
2. ✅ Os detalhes do pedido mostrarão a localização
3. ✅ Profissionais poderão ver pedidos próximos geograficamente

---

## 📞 Suporte

Se encontrar problemas, verifique:

1. Logs dos scripts
2. Permissões no Supabase
3. Formato dos códigos postais na base de dados
4. Rate limits das APIs

---

**Criado por:** HomeService Team  
**Data:** Dezembro 2025  
**Versão:** 1.0
