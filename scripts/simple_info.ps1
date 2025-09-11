Write-Host "=== INSTRUÇÕES DE EXECUÇÃO ===" -ForegroundColor Green
Write-Host ""
Write-Host "PROBLEMA:" -ForegroundColor Red
Write-Host "O script falhou porque 'psql' não está instalado no sistema"
Write-Host ""
Write-Host "SOLUÇÕES:" -ForegroundColor Yellow
Write-Host "1. Use o SQL Editor do Supabase (RECOMENDADO)"
Write-Host "   - Acesse: https://supabase.com/dashboard"
Write-Host "   - Abra seu projeto e vá para SQL Editor"
Write-Host "   - Execute os scripts da pasta sql\ em ordem numérica"
Write-Host ""
Write-Host "2. Instale PostgreSQL para usar o script PowerShell"
Write-Host "   - Baixe: https://www.postgresql.org/download/windows/"
Write-Host "   - Reinstale e execute novamente o script"
Write-Host ""
Write-Host "ARQUIVOS DISPONÍVEIS:" -ForegroundColor Cyan
Get-ChildItem "sql\*.sql" | Sort-Object Name | ForEach-Object { 
    Write-Host "  $($_.Name)" 
}
Write-Host ""
Write-Host "ONDE EXECUTAR:" -ForegroundColor Green
Write-Host "Você está no diretório correto:" 
Get-Location
