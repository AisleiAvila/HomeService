# =====================================================
# Script PowerShell para Importar Dados dos Endereços de Portugal
# =====================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$SupabasePassword,
    
    [Parameter(Mandatory=$false)]
    [string]$CsvPath = "C:\Users\aisle\Downloads"
)

# Configurações
$DatabaseName = "postgres"
$Username = "postgres"
$Host = $SupabaseUrl.Replace("https://", "").Replace(".supabase.co", "")
$Port = 5432
$Host = ($SupabaseUrl -replace "https://", "") -replace ".supabase.co.*", ""
# Arquivos SQL
$SqlFiles = @(
    "01_create_tables_portugal_addresses.sql",
    "02_create_indexes_portugal_addresses.sql", 
    "03_insert_distritos.sql",
    "04_insert_concelhos.sql"
)

Write-Host "=== Importação de Dados dos Endereços de Portugal ===" -ForegroundColor Green
Write-Host "Host: $Host" -ForegroundColor Yellow
Write-Host "Caminho dos CSVs: $CsvPath" -ForegroundColor Yellow

# Verificar se os arquivos CSV existem
$csvFiles = @(
    "$CsvPath\distritos.csv",
    "$CsvPath\concelhos.csv", 
    "$CsvPath\codigos_postais.csv"
)

foreach ($csvFile in $csvFiles) {
    if (-not (Test-Path $csvFile)) {
        Write-Error "Arquivo CSV não encontrado: $csvFile"
        exit 1
    }
    Write-Host "✓ Arquivo encontrado: $csvFile" -ForegroundColor Green
}

# Executar scripts SQL
Write-Host "`n=== Executando Scripts SQL ===" -ForegroundColor Green

foreach ($sqlFile in $SqlFiles) {
    $sqlPath = ".\sql\$sqlFile"
    if (Test-Path $sqlPath) {
        Write-Host "Executando: $sqlFile" -ForegroundColor Yellow
        
        $env:PGPASSWORD = $SupabasePassword
        $result = psql -h $Host -p $Port -U $Username -d $DatabaseName -f $sqlPath 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $sqlFile executado com sucesso" -ForegroundColor Green
        } else {
            Write-Error "Erro ao executar $sqlFile`: $result"
            exit 1
        }
    } else {
        Write-Warning "Arquivo SQL não encontrado: $sqlPath"
    }
}

# Importar códigos postais via COPY
Write-Host "`n=== Importando Códigos Postais ===" -ForegroundColor Green

$copyCommand = @"
\COPY codigos_postais (cod_distrito, cod_concelho, cod_localidade, nome_localidade, cod_arteria, tipo_arteria, prep1, titulo_arteria, prep2, nome_arteria, local_arteria, troco, porta, cliente, num_cod_postal, ext_cod_postal, desig_postal) FROM '$($CsvPath.Replace('\', '/'))/codigos_postais.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',', ENCODING 'UTF8');
"@

$env:PGPASSWORD = $SupabasePassword
$copyResult = echo $copyCommand | psql -h $Host -p $Port -U $Username -d $DatabaseName 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Códigos postais importados com sucesso" -ForegroundColor Green
} else {
    Write-Warning "Erro na importação direta. Tentando método alternativo..."
    
    # Método alternativo usando arquivo SQL
    $sqlPath = ".\sql\05_insert_codigos_postais.sql"
    if (Test-Path $sqlPath) {
        Write-Host "Executando script alternativo para códigos postais..." -ForegroundColor Yellow
        $result = psql -h $Host -p $Port -U $Username -d $DatabaseName -f $sqlPath 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Script alternativo executado" -ForegroundColor Green
        } else {
            Write-Error "Erro no script alternativo: $result"
        }
    }
}

# Verificar resultados
Write-Host "`n=== Verificando Resultados ===" -ForegroundColor Green

$verificationQuery = @"
SELECT 
    'Distritos' as tabela,
    COUNT(*) as total
FROM distritos
UNION ALL
SELECT 
    'Concelhos' as tabela,
    COUNT(*) as total  
FROM concelhos
UNION ALL
SELECT 
    'Códigos Postais' as tabela,
    COUNT(*) as total
FROM codigos_postais;
"@

$env:PGPASSWORD = $SupabasePassword
$verification = echo $verificationQuery | psql -h $Host -p $Port -U $Username -d $DatabaseName -t 2>&1

Write-Host "Totais importados:" -ForegroundColor Yellow
Write-Host $verification

Write-Host "`n=== Importação Concluída ===" -ForegroundColor Green

# Exemplo de uso:
# .\import_portugal_addresses.ps1 -SupabaseUrl "https://uqrvenlkquheajuveggv.supabase.co" -SupabasePassword "sua_senha_aqui"
