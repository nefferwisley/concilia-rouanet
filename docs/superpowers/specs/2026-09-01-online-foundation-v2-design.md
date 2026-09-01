# Fundação Online da Interface v2

## Objetivo

Fazer a interface v2 distinguir claramente dados reais, ausência de dados e indisponibilidade do serviço. Em produção, valores financeiros nunca podem ser preenchidos silenciosamente por `mockData` ou `localStorage`.

## Escopo da primeira entrega

1. Criar contratos versionados em `src/contracts/` para a sessão online e o resumo de projeto.
2. Centralizar o endereço da API em `VITE_API_URL`; nenhuma chamada de saúde pode apontar diretamente para `localhost`.
3. Criar um carregador de sessão que percorre os estados `loading`, `offline`, `empty`, `ready` e `error`.
4. Consultar a lista de projetos pela API e permitir nova tentativa após falha.
5. Manter dados locais apenas em modo de demonstração explícito e nunca como fallback automático em produção.

## Contrato da interface

`OnlineSessionState` contém:

- `status`: `loading | offline | empty | ready | error`;
- `projects`: lista de projetos retornada pela API;
- `activeProjectId`: identificador do projeto selecionado;
- `message`: explicação segura para a pessoa usuária;
- `retry`: callback para uma nova consulta.

Os componentes visuais recebem estado e callbacks por propriedades. Eles não fazem `fetch`, não leem `localStorage` e não conhecem chaves ou URLs privadas.

## Fluxo de dados

1. A aplicação começa em `loading`.
2. O cliente consulta `GET /health` e `GET /api/v1/projetos` no mesmo endereço configurado.
3. Falha de rede resulta em `offline`; resposta inesperada resulta em `error`.
4. Lista vazia resulta em `empty`.
5. Lista com projeto resulta em `ready` e permite selecionar o projeto ativo.
6. Apenas uma opção de demonstração explicitamente ativada pode entregar fixtures locais; ela deve apresentar a identificação visual de demonstração.

## Segurança

- `VITE_GEMINI_API_KEY` não deve ser usado pelo navegador para OCR, auditoria ou chat.
- OCR, IA, Drive e arquivos serão chamados pelo backend autenticado em uma onda posterior.
- O token de sessão é tratado pelo cliente de API, sem incluir dados financeiros em armazenamento local.

## Fora de escopo

- Migração de lançamentos, documentos, rubricas, alertas e conciliação para a API.
- Fila de OCR, upload em lote e processamento de documentos.
- Alteração do backend legado ou publicação em produção.

## Critérios de aceite

- Nenhuma chamada de saúde contém `localhost` fixo.
- Produção não apresenta números financeiros simulados depois de falha da API.
- Uma conta sem projeto recebe um estado vazio claro.
- O estado de erro permite nova tentativa.
- O contrato pode ser consumido por componentes isolados do Antigravity sem dependência de API ou `localStorage`.
- Testes cobrem cada estado de sessão e a montagem correta da URL da API.
