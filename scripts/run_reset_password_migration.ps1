# Script para executar migration de reset de senha no Supabase
# Execute com: .\scripts\run_reset_password_migration.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration: Reset de Senha Customizado" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ler o arquivo SQL
$sqlFile = Join-Path $PSScriptRoot "add_reset_password_fields.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Erro: Arquivo SQL não encontrado em: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Lendo migration SQL..." -ForegroundColor Yellow
$sqlContent = Get-Content $sqlFile -Raw
Write-Host "✅ SQL carregado" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Preview do SQL a ser executado:" -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Gray
Write-Host $sqlContent -ForegroundColor White
Write-Host "-----------------------------------" -ForegroundColor Gray
Write-Host ""

Write-Host "⚠️  INSTRUÇÕES PARA EXECUTAR A MIGRATION:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Acesse: https://app.supabase.com" -ForegroundColor White
Write-Host "2. Selecione o projeto: uqrvenlkquheajuveggv" -ForegroundColor White
Write-Host "3. Va para: SQL Editor (menu lateral)" -ForegroundColor White
Write-Host "4. Clique em 'New Query'" -ForegroundColor White
Write-Host "5. Cole o SQL mostrado acima" -ForegroundColor White
Write-Host "6. Clique em 'Run' ou pressione Ctrl+Enter" -ForegroundColor White
Write-Host ""

# Copiar SQL para clipboard se possível
try {
    Set-Clipboard -Value $sqlContent
    Write-Host "✅ SQL copiado para área de transferência!" -ForegroundColor Green
    Write-Host "   Você pode colar diretamente no Supabase SQL Editor" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Não foi possível copiar para área de transferência" -ForegroundColor Yellow
    Write-Host "   Copie manualmente o SQL acima" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📝 Após executar a migration no Supabase:" -ForegroundColor Cyan
Write-Host "   1. Verifique se as colunas foram criadas:" -ForegroundColor White
Write-Host "      SELECT column_name FROM information_schema.columns" -ForegroundColor Gray
Write-Host "      WHERE table_name = 'users'" -ForegroundColor Gray
Write-Host "      AND column_name IN ('reset_token', 'reset_token_expiry');" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Inicie o servidor de email:" -ForegroundColor White
Write-Host "      node send-email.cjs" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Teste o fluxo de reset de senha" -ForegroundColor White
Write-Host "      (Veja MIGRATION_RESET_PASSWORD.md para detalhes)" -ForegroundColor Gray
Write-Host ""

Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
