# Script para importar coordenadas de códigos postais de um dataset público
# Fonte: https://github.com/centraldedados/codigos_postais
# Este script é MUITO mais rápido que geocodificar via API

param(
    [string]$SupabaseUrl = $env:VITE_SUPABASE_URL,
    [string]$SupabaseKey = $env:VITE_SUPABASE_ANON_KEY,
    [string]$CsvFilePath = ".\codigos_postais_coordenadas.csv"
)

Write-Host "Importacao de Coordenadas de Codigos Postais" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

if (-not $SupabaseUrl -or -not $SupabaseKey) {
    Write-Host "ERRO: Variaveis de ambiente nao encontradas" -ForegroundColor Red
    exit 1
}

# Verificar se o arquivo CSV existe
if (-not (Test-Path $CsvFilePath)) {
    Write-Host "ERRO: Arquivo CSV nao encontrado: $CsvFilePath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Baixe o dataset publico de uma destas fontes:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. GeoNames Portugal (RECOMENDADO - TEM coordenadas):" -ForegroundColor Cyan
    Write-Host "   https://download.geonames.org/export/zip/PT.zip" -ForegroundColor White
    Write-Host ""
    Write-Host "2. OpenAddresses:" -ForegroundColor Cyan
    Write-Host "   https://openaddresses.io/" -ForegroundColor White
    Write-Host ""
    Write-Host "Apos baixar, coloque o arquivo CSV nesta pasta como:" -ForegroundColor Yellow
    Write-Host "   $CsvFilePath" -ForegroundColor White
    Write-Host ""
    Write-Host "O CSV deve ter as colunas: codigo_postal, latitude, longitude" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "apikey" = $SupabaseKey
    "Authorization" = "Bearer $SupabaseKey"
    "Content-Type" = "application/json"
}

Write-Host "Lendo arquivo CSV..." -ForegroundColor Cyan

try {
    # Importar CSV (ajuste os nomes das colunas conforme necessario)
    $csvData = Import-Csv -Path $CsvFilePath -Delimiter ','
    
    Write-Host "Arquivo carregado: $($csvData.Count) registros" -ForegroundColor Green
    Write-Host ""
    
    $updated = 0
    $notFound = 0
    $errors = 0
    $processed = 0
    
    foreach ($row in $csvData) {
        $processed++
        
        # Ajuste os nomes das colunas conforme o seu CSV
        $postalCode = $row.codigo_postal  # ou $row.'Código Postal' ou $row.CP4
        $latitude = $row.latitude          # ou $row.lat
        $longitude = $row.longitude        # ou $row.lon ou $row.lng
        
        if (-not $postalCode -or -not $latitude -or -not $longitude) {
            continue
        }
        
        # Mostrar progresso a cada 100 registros
        if ($processed % 100 -eq 0) {
            Write-Host "[$processed/$($csvData.Count)] Processados..." -ForegroundColor Cyan
        }
        
        try {
            # Atualizar coordenadas no Supabase
            $body = @{
                latitude = [double]$latitude
                longitude = [double]$longitude
            } | ConvertTo-Json
            
            # Buscar por código postal (pode precisar ajustar o formato)
            $url = "$SupabaseUrl/rest/v1/codigos_postais?codigo_postal_completo=eq.$postalCode"
            
            $response = Invoke-RestMethod -Uri $url -Method Patch -Headers $headers -Body $body
            
            $updated++
        }
        catch {
            if ($_.Exception.Message -like "*404*") {
                $notFound++
            }
            else {
                $errors++
                Write-Host "ERRO ao atualizar $postalCode : $_" -ForegroundColor Red
            }
        }
        
        # Pequeno delay para nao sobrecarregar
        if ($processed % 50 -eq 0) {
            Start-Sleep -Milliseconds 100
        }
    }
    
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "Resumo da Importacao" -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "Total processado: $processed" -ForegroundColor White
    Write-Host "Atualizados: $updated" -ForegroundColor Green
    Write-Host "Nao encontrados: $notFound" -ForegroundColor Yellow
    Write-Host "Erros: $errors" -ForegroundColor Red
}
catch {
    Write-Host "ERRO ao processar CSV: $_" -ForegroundColor Red
    exit 1
}
