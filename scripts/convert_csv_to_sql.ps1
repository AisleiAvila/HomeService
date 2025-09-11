# =====================================================
# Script PowerShell para Converter CSV em INSERTs SQL
# =====================================================

param(
    [string]$CsvPath = "C:\Users\aisle\Downloads\codigos_postais.csv",
    [string]$OutputPath = ".\sql\10_generated_inserts.sql",
    [int]$BatchSize = 50
)

Write-Host "=== Convertendo CSV para SQL INSERTs ===" -ForegroundColor Green

# Verificar se o arquivo CSV existe
if (-not (Test-Path $CsvPath)) {
    Write-Error "Arquivo CSV não encontrado: $CsvPath"
    exit 1
}

# Ler CSV
Write-Host "Lendo arquivo CSV..." -ForegroundColor Yellow
$dados = Import-Csv $CsvPath

Write-Host "Total de registros: $($dados.Count)" -ForegroundColor Cyan

# Criar arquivo SQL
$sqlContent = @"
-- =====================================================
-- Inserções Geradas Automaticamente para Códigos Postais
-- Total de registros: $($dados.Count)
-- Gerado em: $(Get-Date)
-- =====================================================

"@

$batchCount = 0
$totalBatches = [Math]::Ceiling($dados.Count / $BatchSize)

for ($i = 0; $i -lt $dados.Count; $i += $BatchSize) {
    $batchCount++
    $batch = $dados[$i..([Math]::Min($i + $BatchSize - 1, $dados.Count - 1))]
    
    Write-Host "Processando lote $batchCount de $totalBatches..." -ForegroundColor Yellow
    
    $sqlContent += "`n-- Lote $batchCount`n"
    $sqlContent += "INSERT INTO codigos_postais (`n"
    $sqlContent += "    cod_distrito, cod_concelho, cod_localidade, nome_localidade,`n"
    $sqlContent += "    cod_arteria, tipo_arteria, prep1, titulo_arteria, prep2,`n"
    $sqlContent += "    nome_arteria, local_arteria, troco, porta, cliente,`n"
    $sqlContent += "    num_cod_postal, ext_cod_postal, desig_postal`n"
    $sqlContent += ") VALUES`n"
    
    $values = @()
    foreach ($linha in $batch) {
        # Escapar aspas simples e tratar valores nulos
        $cod_distrito = if ($linha.cod_distrito) { "'$($linha.cod_distrito.Replace("'", "''"))'" } else { "NULL" }
        $cod_concelho = if ($linha.cod_concelho) { "'$($linha.cod_concelho.Replace("'", "''"))'" } else { "NULL" }
        $cod_localidade = if ($linha.cod_localidade) { "'$($linha.cod_localidade.Replace("'", "''"))'" } else { "NULL" }
        $nome_localidade = if ($linha.nome_localidade) { "'$($linha.nome_localidade.Replace("'", "''"))'" } else { "NULL" }
        $cod_arteria = if ($linha.cod_arteria) { "'$($linha.cod_arteria.Replace("'", "''"))'" } else { "NULL" }
        $tipo_arteria = if ($linha.tipo_arteria) { "'$($linha.tipo_arteria.Replace("'", "''"))'" } else { "NULL" }
        $prep1 = if ($linha.prep1) { "'$($linha.prep1.Replace("'", "''"))'" } else { "NULL" }
        $titulo_arteria = if ($linha.titulo_arteria) { "'$($linha.titulo_arteria.Replace("'", "''"))'" } else { "NULL" }
        $prep2 = if ($linha.prep2) { "'$($linha.prep2.Replace("'", "''"))'" } else { "NULL" }
        $nome_arteria = if ($linha.nome_arteria) { "'$($linha.nome_arteria.Replace("'", "''"))'" } else { "NULL" }
        $local_arteria = if ($linha.local_arteria) { "'$($linha.local_arteria.Replace("'", "''"))'" } else { "NULL" }
        $troco = if ($linha.troco) { "'$($linha.troco.Replace("'", "''"))'" } else { "NULL" }
        $porta = if ($linha.porta) { "'$($linha.porta.Replace("'", "''"))'" } else { "NULL" }
        $cliente = if ($linha.cliente) { "'$($linha.cliente.Replace("'", "''"))'" } else { "NULL" }
        $num_cod_postal = if ($linha.num_cod_postal) { "'$($linha.num_cod_postal)'" } else { "NULL" }
        $ext_cod_postal = if ($linha.ext_cod_postal) { "'$($linha.ext_cod_postal)'" } else { "NULL" }
        $desig_postal = if ($linha.desig_postal) { "'$($linha.desig_postal.Replace("'", "''"))'" } else { "NULL" }
        
        $valueString = "($cod_distrito, $cod_concelho, $cod_localidade, $nome_localidade, $cod_arteria, $tipo_arteria, $prep1, $titulo_arteria, $prep2, $nome_arteria, $local_arteria, $troco, $porta, $cliente, $num_cod_postal, $ext_cod_postal, $desig_postal)"
        $values += $valueString
    }
    
    $sqlContent += $values -join ",`n"
    $sqlContent += "`nON CONFLICT DO NOTHING;`n"
    $sqlContent += "`n-- Verificar lote $batchCount`n"
    $sqlContent += "SELECT COUNT(*) as total_apos_lote_$batchCount FROM codigos_postais;`n"
}

# Adicionar verificação final
$sqlContent += @"

-- =====================================================
-- Verificação Final
-- =====================================================
SELECT COUNT(*) as total_final FROM codigos_postais;

-- Verificar distribuição por distrito
SELECT 
    d.nome_distrito,
    COUNT(cp.id) as total_codigos_postais
FROM distritos d
LEFT JOIN codigos_postais cp ON d.cod_distrito = cp.cod_distrito
GROUP BY d.cod_distrito, d.nome_distrito
ORDER BY total_codigos_postais DESC;

-- Verificar alguns exemplos
SELECT 
    codigo_postal_completo,
    desig_postal,
    tipo_arteria,
    nome_arteria,
    nome_localidade
FROM codigos_postais 
ORDER BY codigo_postal_completo
LIMIT 10;
"@

# Salvar arquivo
Write-Host "Salvando arquivo SQL..." -ForegroundColor Yellow
$sqlContent | Out-File -FilePath $OutputPath -Encoding UTF8

Write-Host "✅ Conversão concluída!" -ForegroundColor Green
Write-Host "Arquivo gerado: $OutputPath" -ForegroundColor Cyan
Write-Host "Total de lotes: $totalBatches" -ForegroundColor Cyan
Write-Host "" 
Write-Host "PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Abra o arquivo gerado no SQL Editor do Supabase" -ForegroundColor White
Write-Host "2. Execute lote por lote (não tudo de uma vez)" -ForegroundColor White
Write-Host "3. Aguarde cada lote terminar antes de executar o próximo" -ForegroundColor White
