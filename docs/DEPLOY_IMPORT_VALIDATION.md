# Pré-validação estruturada — publicação 2026-10-07

Alvo: repositório nefferwisley/concilia-rouanet, main, serviço gratuito Render
concilia-rouanet-1961 (srv-daetnnfqj5pc73atdcq0).

## Entrega

- POST /api/v1/projetos/{projeto_id}/planilha/validar: relatório XLSX sem escrita.
- POST /api/v1/importacoes/validar: relatório JSON/YAML sem job nem escrita.
- Ambas as rotas de importação revalidam; arquivos inválidos não são gravados.
- Aliases profissionais explícitos, campos ignorados visíveis e ambiguidades
  bloqueadas. PRONAC JSON/YAML conferido contra o projeto autorizado.
- Modal de pastas oferece seção independente "Pré-validar planilha XLSX ou
  JSON + YAML". Requer login, projeto online com PRONAC único, validação e
  confirmação manual. Troca de projeto/arquivo/configuração invalida a aprovação.
- Importação JSON é enfileirada; a confirmação não indica processamento concluído.
- XLSX mantém REPLACE transacional já existente; aviso explícito antes de confirmar.
  Não aplica a versão local de sync/auditoria, que requer outro schema/migrations.
  Não atualiza automaticamente as coleções do dashboard.
- Títulos da API, login e cabeçalho corrigidos para RevisaRouanet. CORS e keepalive de 10 minutos
  já estavam publicados; não foram recriados domínios ou recursos.
- pytest-asyncio fixado nas dependências para não ignorar os testes async no build.

## Evidências locais e limites

No checkout de publicação: 451 testes backend/motor passaram, sete avisos;
123 testes frontend em 29 arquivos passaram. As novas rotas foram testadas
com conexões/jobs simulados e dados sintéticos. Lint TypeScript passou.
Build Vite aprovado, com avisos existentes de chunks grandes e import misto
do Google Drive. Deploy deve ser confirmado antes do handoff final.

Sem novas migrations, alteração de credenciais ou recursos pagos. O build Render
testa backend com APP_ENV=test; o runtime continua APP_ENV=production.

Não comprovado: importação financeira real ponta a ponta, RLS/storage reais,
IA externa, corpus profissional de PDFs/pastas e garantia de ausência de erros.
O cron GitHub pode atrasar; não garante disponibilidade contínua.

## Verificação e recuperação

Após o push, confirmar commit/status live no Render, /health, /health/db,
OpenAPI com as duas rotas, autenticação 401 sem sessão e HTML/assets publicados.
Não criar registros financeiros sintéticos em produção.

Se o build/health gate falhar, manter a versão live anterior. Para regressão após
live, usar redeploy da versão anterior c309a9e pelo painel Render ou revert do
commit de release e push, preservando o histórico. Não usar force-push/reset.
O health check configurado é /health; não representa aprovação de todos os fluxos
financeiros nem rollback automático de regressões funcionais.
