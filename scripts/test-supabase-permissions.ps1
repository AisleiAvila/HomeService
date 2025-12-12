# Script para testar permissões de UPDATE na tabela codigos_postais
# Use este script para diagnosticar problemas de RLS (Row Level Security)

param(
    [string]$SupabaseUrl = $env:VITE_SUPABASE_URL,
    [string]$SupabaseKey = $env:VITE_SUPABASE_ANON_KEY
)

Write-Host "=== TESTE DE PERMISSOES DA TABELA codigos_postais ===" -ForegroundColor Cyan
Write-Host ""

if (-not $SupabaseUrl -or -not $SupabaseKey) {
    Write-Host "ERRO: Configure as variaveis de ambiente primeiro:" -ForegroundColor Red
    Write-Host '  $env:VITE_SUPABASE_URL = "https://seu-projeto.supabase.co"' -ForegroundColor Yellow
    Write-Host '  $env:VITE_SUPABASE_ANON_KEY = "sua-key"' -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "apikey" = $SupabaseKey
    "Authorization" = "Bearer $SupabaseKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# Teste 1: Buscar um registro
Write-Host "Teste 1: Buscando um registro..." -ForegroundColor Cyan
try {
    $url = "$SupabaseUrl/rest/v1/codigos_postais?limit=1"
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    
    if ($result -and $result.Count -gt 0) {
        $testRecord = $result[0]
        Write-Host "OK - Encontrado registro:" -ForegroundColor Green
        Write-Host "  ID: $($testRecord.id)" -ForegroundColor White
        Write-Host "  Codigo Postal: $($testRecord.codigo_postal_completo)" -ForegroundColor White
        Write-Host "  Localidade: $($testRecord.nome_localidade)" -ForegroundColor White
        Write-Host "  Latitude atual: $($testRecord.latitude)" -ForegroundColor White
        Write-Host "  Longitude atual: $($testRecord.longitude)" -ForegroundColor White
        Write-Host ""
        
        # Teste 2: Tentar atualizar este registro
        Write-Host "Teste 2: Tentando atualizar latitude e longitude..." -ForegroundColor Cyan
        
        $testLat = if ($testRecord.latitude) { $testRecord.latitude } else { 38.7139 }
        $testLng = if ($testRecord.longitude) { $testRecord.longitude } else { -9.1394 }
        
        $body = @{
            latitude = $testLat
            longitude = $testLng
        } | ConvertTo-Json
        
        $updateUrl = "$SupabaseUrl/rest/v1/codigos_postais?id=eq.$($testRecord.id)"
        
        try {
            $updateResult = Invoke-RestMethod -Uri $updateUrl -Method Patch -Headers $headers -Body $body
            Write-Host "OK - UPDATE executado com sucesso!" -ForegroundColor Green
            Write-Host "  Linhas afetadas: $($updateResult.Count)" -ForegroundColor White
            
            if ($updateResult.Count -eq 0) {
                Write-Host "" -ForegroundColor Yellow
                Write-Host "AVISO: UPDATE executou mas nenhuma linha foi afetada!" -ForegroundColor Yellow
                Write-Host "Isso geralmente indica:" -ForegroundColor Yellow
                Write-Host "  1. RLS (Row Level Security) esta bloqueando UPDATEs" -ForegroundColor Yellow
                Write-Host "  2. A chave usada (ANON_KEY) nao tem permissao de UPDATE" -ForegroundColor Yellow
                Write-Host "" -ForegroundColor Yellow
                Write-Host "SOLUCAO:" -ForegroundColor Cyan
                Write-Host "  1. Va ao Supabase Dashboard" -ForegroundColor White
                Write-Host "  2. Authentication > Policies" -ForegroundColor White
                Write-Host "  3. Tabela 'codigos_postais'" -ForegroundColor White
                Write-Host "  4. Adicione uma policy de UPDATE:" -ForegroundColor White
                Write-Host "     - Policy name: 'Allow anon update coordinates'" -ForegroundColor Gray
                Write-Host "     - Target roles: anon" -ForegroundColor Gray
                Write-Host "     - USING expression: true" -ForegroundColor Gray
                Write-Host "     - WITH CHECK expression: true" -ForegroundColor Gray
                Write-Host "" -ForegroundColor White
                Write-Host "  OU use SERVICE_ROLE_KEY em vez de ANON_KEY" -ForegroundColor White
                Write-Host "     (mais seguro para scripts de manutencao)" -ForegroundColor White
            }
            else {
                Write-Host "" -ForegroundColor Green
                Write-Host "SUCESSO! As permissoes estao OK." -ForegroundColor Green
                Write-Host "O script de geocodificacao deve funcionar corretamente." -ForegroundColor Green
            }
        }
        catch {
            Write-Host "ERRO ao executar UPDATE:" -ForegroundColor Red
            Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
            if ($_.ErrorDetails.Message) {
                Write-Host "  Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Red
            }
            
            Write-Host "" -ForegroundColor Yellow
            Write-Host "Possivel causa: Permissoes RLS bloqueando UPDATE" -ForegroundColor Yellow
            Write-Host "Veja a solucao acima." -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "ERRO: Nenhum registro encontrado na tabela" -ForegroundColor Red
    }
}
catch {
    Write-Host "ERRO ao buscar registros:" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== FIM DO TESTE ===" -ForegroundColor Cyan
