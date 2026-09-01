# Operação online — Fundação v2

## Configuração

| Variable | Required in production | Meaning |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Base URL ending in `/api/v1` for the FastAPI service. |
| `VITE_DEMO_MODE` | No | Set exactly to `true` only for the clearly labelled local demonstration mode. |

Exemplo: se a API estiver em `https://api.exemplo.com`, configure
`VITE_API_URL=https://api.exemplo.com/api/v1`.

## O que cada mensagem significa

- **Sistema offline:** não foi possível chegar à API. Não significa saldo zero ou projeto sem pendências.
- **Nenhum projeto disponível:** a API respondeu, mas a conta não tem projeto acessível.
- **Não foi possível carregar os projetos:** a API respondeu ao health check, mas a listagem falhou.
- **Sessão online preparada:** a API retornou o resumo do projeto. Os totais financeiros ainda não são exibidos até que cada domínio seja migrado da base local para a API.

## Modo demonstração

Use `VITE_DEMO_MODE=true` somente para apresentar o protótipo local. A interface exibe um aviso amarelo para deixar claro que esses dados não representam a operação online.

## Verificações antes de publicar

```bash
npm run lint
npm test -- --run
npm run build
python -m pytest backend/tests/test_endpoints_delete_patch.py -v
```

## Riscos ainda abertos

- Chamadas diretas ao Gemini/OCR existentes no navegador ainda precisam ser migradas para o backend antes de processar dados reais.
- O endpoint de upload em `backend/routes/real_imports.py` voltou a ser importável, mas contém consultas SQL antigas com parâmetros incompletos; ele não deve ser usado para importações reais até receber uma correção e testes próprios.
- Lançamentos, documentos, rubricas, conciliação e indicadores financeiros permanecem na próxima onda de migração da API.
