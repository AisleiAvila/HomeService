# Script para geocodificar códigos postais portugueses usando Nominatim (OpenStreetMap)
# Este script respeita o limite de 1 requisição por segundo da API Nominatim

param(
    [string]$SupabaseUrl = $env:VITE_SUPABASE_URL,
    [string]$SupabaseKey = $env:VITE_SUPABASE_ANON_KEY,
    [int]$BatchSize = 100,
    [int]$StartOffset = 0
)

Write-Host "Geocodificacao de Codigos Postais de Portugal" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if (-not $SupabaseUrl -or -not $SupabaseKey) {
    Write-Host "ERRO: Variaveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nao encontradas" -ForegroundColor Red
    Write-Host "Configure as variáveis ou passe como parâmetros." -ForegroundColor Yellow
    exit 1
}

# Configuração
$headers = @{
    "apikey" = $SupabaseKey
    "Authorization" = "Bearer $SupabaseKey"
    "Content-Type" = "application/json"
}

# User-Agent para Nominatim (obrigatório)
$nominatimHeaders = @{
    "User-Agent" = "HomeService-Portugal-Geocoding/1.0 (contact@homeservice.pt)"
}

# Função para geocodificar usando Nominatim
function Get-Coordinates {
    param(
        [string]$PostalCode,
        [string]$Locality,
        [string]$District
    )
    
    try {
        # Formatar query para Portugal
        $query = "$PostalCode, $Locality, $District, Portugal"
        $encodedQuery = [System.Web.HttpUtility]::UrlEncode($query)
        
        $url = "https://nominatim.openstreetmap.org/search?q=$encodedQuery&format=json&limit=1&countrycodes=pt"
        
        $response = Invoke-RestMethod -Uri $url -Headers $nominatimHeaders -Method Get -TimeoutSec 30
        
        if ($response -and $response.Count -gt 0) {
            return @{
                latitude = [double]$response[0].lat
                longitude = [double]$response[0].lon
                success = $true
            }
        }
        
        return @{ success = $false }
    }
    catch {
        Write-Host "AVISO: Erro ao geocodificar $PostalCode : $_" -ForegroundColor Yellow
        return @{ success = $false }
    }
}

# Função para atualizar coordenadas no Supabase
function Update-CoordinatesInDB {
    param(
        [int]$Id,
        [double]$Latitude,
        [double]$Longitude
    )
    
    $body = @{
        latitude = $Latitude
        longitude = $Longitude
    } | ConvertTo-Json
    
    $url = "$SupabaseUrl/rest/v1/codigos_postais?id=eq.$Id"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Patch -Headers $headers -Body $body
        return $true
    }
    catch {
        $errorDetails = $_.Exception.Message
        if ($_.ErrorDetails.Message) {
            $errorDetails += " - " + $_.ErrorDetails.Message
        }
        Write-Host " [ERRO: $errorDetails]" -ForegroundColor Red -NoNewline
        return $false
    }
}

# Contadores globais
$totalProcessed = 0
$totalSuccess = 0
$totalFailed = 0
$currentOffset = $StartOffset

Write-Host "Iniciando geocodificacao completa de codigos postais..." -ForegroundColor Cyan
Write-Host ""

try {
    # Loop continuo ate processar todos
    do {
        # Carregar lote atual
        $url = "${SupabaseUrl}/rest/v1/codigos_postais?select=id,codigo_postal_completo,nome_localidade,cod_distrito&latitude=is.null&limit=${BatchSize}&offset=${currentOffset}"
        
        $postalCodes = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        
        if (-not $postalCodes -or $postalCodes.Count -eq 0) {
            Write-Host ""
            Write-Host "Todos os codigos postais foram processados!" -ForegroundColor Green
            break
        }
        
        Write-Host "Lote: Offset $currentOffset - $($postalCodes.Count) registros" -ForegroundColor Cyan
        
        foreach ($postal in $postalCodes) {
            $totalProcessed++
            
            Write-Host "[$totalProcessed] $($postal.codigo_postal_completo) - $($postal.nome_localidade)" -NoNewline
            
            # Geocodificar
            $coords = Get-Coordinates -PostalCode $postal.codigo_postal_completo -Locality $postal.nome_localidade -District $postal.cod_distrito
            
            if ($coords.success) {
                # Atualizar no banco
                $updated = Update-CoordinatesInDB -Id $postal.id -Latitude $coords.latitude -Longitude $coords.longitude
                
                if ($updated) {
                    Write-Host " OK ($($coords.latitude), $($coords.longitude))" -ForegroundColor Green
                    $totalSuccess++
                }
                else {
                    Write-Host " ERRO: Falha ao atualizar" -ForegroundColor Red
                    $totalFailed++
                }
            }
            else {
                Write-Host " AVISO: Nao encontrado" -ForegroundColor Yellow
                $totalFailed++
            }
            
            # Aguardar 1 segundo (limite Nominatim)
            Start-Sleep -Seconds 1
        }
        
        # Proximo lote
        $currentOffset += $BatchSize
        Write-Host ""
        
    } while ($postalCodes.Count -eq $BatchSize)
    
    # Resumo final
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "Resumo Final da Geocodificacao" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "Total processado: $totalProcessed" -ForegroundColor White
    Write-Host "Sucesso: $totalSuccess" -ForegroundColor Green
    Write-Host "Falhas: $totalFailed" -ForegroundColor Red
    Write-Host "Taxa de sucesso: $(if ($totalProcessed -gt 0) { [math]::Round(($totalSuccess / $totalProcessed) * 100, 2) } else { 0 })%" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Geocodificacao completa!" -ForegroundColor Green
}
catch {
    Write-Host "ERRO: Falha ao carregar codigos postais: $_" -ForegroundColor Red
    exit 1
}
