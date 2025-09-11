# =====================================================
# Script PowerShell ALTERNATIVO - Usa API REST do Supabase
# =====================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$SupabaseServiceKey,
    
    [Parameter(Mandatory=$false)]
    [string]$CsvPath = "C:\Users\aisle\Downloads"
)

# Função para executar SQL via API REST
function Invoke-SupabaseSql {
    param(
        [string]$Sql,
        [string]$Url,
        [string]$ServiceKey
    )
    
    $headers = @{
        'apikey' = $ServiceKey
        'Authorization' = "Bearer $ServiceKey"
        'Content-Type' = 'application/json'
        'Prefer' = 'return=minimal'
    }
    
    $body = @{
        query = $Sql
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$Url/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body
        return $response
    }
    catch {
        Write-Error "Erro ao executar SQL: $($_.Exception.Message)"
        throw
    }
}

# Função para inserir dados via API REST
function Insert-SupabaseData {
    param(
        [string]$Table,
        [array]$Data,
        [string]$Url,
        [string]$ServiceKey
    )
    
    $headers = @{
        'apikey' = $ServiceKey
        'Authorization' = "Bearer $ServiceKey"
        'Content-Type' = 'application/json'
        'Prefer' = 'return=minimal'
    }
    
    $body = $Data | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "$Url/rest/v1/$Table" -Method Post -Headers $headers -Body $body
        return $response
    }
    catch {
        Write-Warning "Erro ao inserir dados em $Table`: $($_.Exception.Message)"
        return $null
    }
}

Write-Host "=== Importação via API REST do Supabase ===" -ForegroundColor Green
Write-Host "URL: $SupabaseUrl" -ForegroundColor Yellow
Write-Host "Caminho dos CSVs: $CsvPath" -ForegroundColor Yellow

# Verificar se os arquivos CSV existem
$csvFiles = @(
    "$CsvPath\distritos.csv",
    "$CsvPath\concelhos.csv"
)

foreach ($csvFile in $csvFiles) {
    if (-not (Test-Path $csvFile)) {
        Write-Error "Arquivo CSV não encontrado: $csvFile"
        exit 1
    }
    Write-Host "✓ Arquivo encontrado: $csvFile" -ForegroundColor Green
}

Write-Host "`n=== Executando via API REST ===" -ForegroundColor Green

try {
    # 1. Criar tabelas (apenas estrutura básica via API)
    Write-Host "1. Criando tabelas..." -ForegroundColor Yellow
    
    # Para usar a API REST, precisamos criar as tabelas diretamente no Supabase SQL Editor
    # Este script focará na inserção dos dados
    
    # 2. Inserir distritos
    Write-Host "2. Inserindo distritos..." -ForegroundColor Yellow
    
    if (Test-Path "$CsvPath\distritos.csv") {
        $distritos = Import-Csv "$CsvPath\distritos.csv"
        $distritosData = @()
        
        foreach ($distrito in $distritos) {
            $distritosData += @{
                cod_distrito = $distrito.cod_distrito
                nome_distrito = $distrito.nome_distrito
            }
        }
        
        $result = Insert-SupabaseData -Table "distritos" -Data $distritosData -Url $SupabaseUrl -ServiceKey $SupabaseServiceKey
        if ($result) {
            Write-Host "✓ Distritos inseridos com sucesso" -ForegroundColor Green
        }
    }
    
    # 3. Inserir concelhos
    Write-Host "3. Inserindo concelhos..." -ForegroundColor Yellow
    
    if (Test-Path "$CsvPath\concelhos.csv") {
        $concelhos = Import-Csv "$CsvPath\concelhos.csv"
        $concelhosData = @()
        
        foreach ($concelho in $concelhos) {
            $concelhosData += @{
                cod_distrito = $concelho.cod_distrito
                cod_concelho = $concelho.cod_concelho
                nome_concelho = $concelho.nome_concelho
            }
        }
        
        # Inserir em lotes de 100 para evitar timeout
        $batchSize = 100
        for ($i = 0; $i -lt $concelhosData.Count; $i += $batchSize) {
            $batch = $concelhosData[$i..([Math]::Min($i + $batchSize - 1, $concelhosData.Count - 1))]
            $result = Insert-SupabaseData -Table "concelhos" -Data $batch -Url $SupabaseUrl -ServiceKey $SupabaseServiceKey
            Write-Host "  Lote $([Math]::Floor($i/$batchSize) + 1) inserido" -ForegroundColor Cyan
        }
        Write-Host "✓ Concelhos inseridos com sucesso" -ForegroundColor Green
    }
    
    Write-Host "`n=== Importação Concluída ===" -ForegroundColor Green
    Write-Host "NOTA: Para os códigos postais, use o SQL Editor do Supabase devido ao volume de dados." -ForegroundColor Yellow
    
} catch {
    Write-Error "Erro durante a importação: $($_.Exception.Message)"
    exit 1
}

# Exemplo de uso:
# .\import_portugal_addresses_api.ps1 -SupabaseUrl "https://uqrvenlkquheajuveggv.supabase.co" -SupabaseServiceKey "sua_service_key_aqui"
