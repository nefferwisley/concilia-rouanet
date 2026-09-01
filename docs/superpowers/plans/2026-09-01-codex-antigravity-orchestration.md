# Codex–Antigravity Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dividir a evolução do Concilia Rouanet entre Codex e Antigravity/Gemini sem conflitos de arquivos, perda de histórico ou publicação de versões incompletas.

**Architecture:** Codex é o integrador e único responsável por contratos, backend, banco, segurança, Git canônico, testes globais e deploy. Antigravity implementa componentes visuais isolados em branches próprias, consumindo contratos previamente congelados e sem editar pontos de integração. Cada onda termina em revisão e smoke test pelo Codex antes da próxima começar.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, FastAPI, PostgreSQL/Supabase, Supabase Storage/Realtime, Render, Cloudflare Pages, Gemini OCR, Vitest e pytest.

**Spec:** `docs/superpowers/specs/2026-08-20-importacao-real-conciliacao-online-design.md`

## Global Constraints

- Nunca usar `git push --force`, `git reset --hard`, limpeza ampla ou reescrever `main`.
- A referência canônica é `origin/main`; o histórico local divergente deve ser portado seletivamente, nunca forçado sobre o remoto.
- Antigravity trabalha em `ag/<onda>-<tarefa>`; Codex trabalha em `codex/<onda>-integration`.
- Antigravity não edita `src/App.tsx`, backend, migrations, arquivos de deploy, contratos compartilhados ou configuração de ambiente.
- Codex é o único agente autorizado a integrar em `main` e publicar no Render ou Cloudflare.
- Dados reais, PII, tokens, chaves, PDFs e respostas OCR não entram no Git.
- Todo lote, upload e write endpoint deve ser idempotente.
- Nenhuma tela de produção pode usar `mockData` ou `localStorage` como fonte de verdade.
- Cada entrega deve incluir commit, arquivos alterados, testes executados, screenshot e riscos residuais.

---

## Matriz de responsabilidade

| Área | Codex | Antigravity/Gemini |
|---|---|---|
| Git, branches, integração e deploy | Dono exclusivo | Sem deploy e sem `main` |
| `backend/**`, `motor/**`, `db/**`, migrations | Dono exclusivo | Não editar |
| `src/App.tsx`, roteamento e providers | Dono exclusivo | Não editar |
| Contratos em `src/contracts/**` | Define e congela | Apenas consome |
| Componentes visuais novos | Integra e revisa | Implementa em pasta isolada |
| Testes de backend e integração | Implementa | Não editar |
| Testes unitários de componentes | Revisa | Implementa junto do componente |
| Segurança, RLS, RBAC e auditoria | Dono exclusivo | Exibe estados definidos no contrato |
| Smoke test e validação de produção | Dono exclusivo | Fornece screenshots locais |

## Política de modelos no Antigravity

- **Gemini Pro:** fluxos com múltiplos estados, tabelas, modais, acessibilidade e componentes que dependem de vários contratos.
- **Gemini Flash:** componentes pequenos, testes unitários, ajustes de copy, responsividade e correções visuais localizadas.
- Uma tarefa não troca de modelo no meio. Se o Flash não fechar a tarefa em duas tentativas, reiniciar a tarefa com Pro usando o mesmo contrato e o relatório das falhas.

---

### Task 0: Restabelecer uma base Git canônica

**Owner:** Codex, sem trabalho paralelo do Antigravity.

**Files:** apenas Git/worktree e arquivos já alterados que forem aprovados para portabilidade.

**Entrega:** uma branch baseada em `origin/main` com merge-base válido, mudanças locais verificadas portadas seletivamente e nenhuma perda do remoto.

- [ ] Atualizar referências remotas e registrar hashes de `origin/main` e da versão local publicada.
- [ ] Criar worktree limpa em `codex/w0-canonical-baseline` a partir de `origin/main`.
- [ ] Gerar patch de segurança do estado local sujo, incluindo a lista dos arquivos não rastreados.
- [ ] Portar somente as melhorias já validadas: resumo financeiro, 82 pendências, filtro por categoria, saneamento de dados, matching e testes associados.
- [ ] Rodar `npm run lint`, `npm test -- --run`, `npm run build` e `python -m pytest backend/tests -q`.
- [ ] Confirmar que a branch possui base comum com `origin/main` e que nenhum commit remoto foi removido.
- [ ] Registrar o hash-base no handoff da Onda 1.

**Gate 0:** árvore limpa, quatro comandos verdes e diff revisado antes de qualquer paralelismo.

---

### Task 1: Contratos e fundação online

#### Codex — backend, estado canônico e integração

**Owns:** `src/App.tsx`, `src/services/apiClient.ts`, novos `src/contracts/**`, autenticação, backend, migrations, `render.yaml` e ambientes.

- [ ] Definir contratos versionados para projeto, arquivo, lote, item OCR, progresso, evidência, pendência e erro.
- [ ] Corrigir a configuração pública: `VITE_API_URL`, `GOOGLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_ENV=production` e CORS restrito.
- [ ] Substituir inicialização por `mockData`/`localStorage` por PostgreSQL, mantendo no navegador apenas preferência de interface não financeira.
- [ ] Implementar autenticação real, estado vazio, criação/listagem/seleção de projeto e persistência após recarregar.
- [ ] Publicar um pacote de contratos congelado para o Antigravity contendo tipos, estados e fixtures sem PII.

#### Antigravity — estados visuais online

**Allowed files:** novos componentes em `src/components/online/**` e seus testes. **Forbidden:** `App.tsx`, `apiClient.ts`, `types.ts`, backend e configuração.

- [ ] Criar `OnlineConnectionBanner`, `OnlineEmptyProjectState`, `OnlineLoadingState` e `OnlineErrorState`.
- [ ] Cobrir desktop/mobile, teclado, foco, leitor de tela e estados offline/retry.
- [ ] Usar callbacks recebidos por props; nenhum `fetch`, Supabase ou `localStorage` dentro dos componentes.
- [ ] Entregar screenshots e testes Vitest/Testing Library.

**Gate 1:** conta nova inicia vazia, cria projeto, recarrega e recebe o mesmo projeto do banco; a versão pública não contém URL `localhost`.

---

### Task 2: Upload e OCR durável para 500+ arquivos

#### Codex — pipeline

**Owns:** schema/migrations de lotes, API, Storage, worker, fila e observabilidade.

- [ ] Implementar upload direto e retomável para bucket privado, com hash SHA-256 e deduplicação.
- [ ] Persistir `batch`, `batch_item`, tentativas, página, estado, erro e custo; nunca guardar progresso apenas em memória.
- [ ] Criar worker separado do web service com concorrência configurável, backoff, dead-letter e retomada após reinício.
- [ ] Extrair texto nativo antes do OCR e processar PDFs digitalizados página por página.
- [ ] Expor endpoints idempotentes de criar, pausar, retomar, cancelar e reprocessar somente falhas.
- [ ] Emitir progresso por Realtime/SSE com polling REST como fallback.
- [ ] Criar teste de carga controlado com 500 arquivos sintéticos e teste de retomada após interrupção do worker.

#### Antigravity — interface do lote

**Allowed files:** novos componentes em `src/components/import/**` e testes.

- [ ] Criar painel de seleção, validação prévia e resumo por quantidade, páginas, tamanho e duplicados.
- [ ] Criar progresso com estados `QUEUED`, `UPLOADING`, `EXTRACTING`, `CLASSIFIED`, `REVIEW_REQUIRED`, `DONE`, `FAILED` e `CANCELED`.
- [ ] Criar filtros por status, busca por nome, retry de falhas e resumo de custo/tempo.
- [ ] Não simular conclusão: componentes exibem apenas dados recebidos pelo contrato.

**Gate 2:** 500 arquivos são aceitos em uma operação, continuam após fechar a página, sobrevivem ao reinício e não duplicam no reenvio.

---

### Task 3: Evidência, miniatura e revisão humana

#### Codex — proveniência e vínculo

- [ ] Salvar por campo: arquivo, página, trecho, método, modelo/versão e confiança.
- [ ] Gerar URLs assinadas curtas, thumbnails e coordenadas do trecho destacado no PDF.
- [ ] Implementar matching determinístico/probabilístico com confirmação humana obrigatória para ambiguidades.
- [ ] Persistir aprovar, rejeitar, substituir e desvincular como eventos imutáveis.
- [ ] Garantir que todo arquivo lido seja automaticamente anexado ao lançamento correspondente ou marcado com motivo explícito de não vínculo.

#### Antigravity — visualização e fila de revisão

**Allowed files:** novos componentes em `src/components/evidence/**` e `src/components/review/**`, mais testes.

- [ ] Criar miniatura com hover, visualizador de PDF com destaque e fallback acessível.
- [ ] Criar comparação lado a lado: extrato, documento fiscal, comprovante e rubrica.
- [ ] Criar fila de baixa confiança com aprovar, rejeitar e escolher candidato.
- [ ] Mostrar origem e confiança; nunca gerar valor ausente para completar a interface.

**Gate 3:** cada lançamento possui evidência clicável ou uma pendência explícita; o resultado sobrevive ao reload e aparece na trilha.

---

### Task 4: Fechar módulos de negócio ainda demonstrativos

Cada subonda começa por contrato/API do Codex e só depois libera a UI para o Antigravity.

#### 4A — Fiscal oficial

- **Codex:** adaptadores reais e auditáveis para fontes oficiais disponíveis, estados indisponível/pendente/válido/inválido e cache controlado.
- **Antigravity:** painel de validação com fonte, horário, protocolo e tratamento de indisponibilidade.
- **Aceite:** nenhuma regra de número fictício decide validade fiscal.

#### 4B — Orçamento preventivo

- **Codex:** política versionada de remanejamento, bloqueio/alerta, justificativa e aprovação por perfil.
- **Antigravity:** fluxo de bloqueio, justificativa e acompanhamento da autorização.
- **Aceite:** operação acima do limite não segue silenciosamente.

#### 4C — Captação e fontes

- **Codex:** entidades patrocinador, aporte, fonte, conta, recibo de mecenato e vínculos ao projeto.
- **Antigravity:** substituir dados fixos por cadastro, extrato de aportes e emissão/consulta de recibo.
- **Aceite:** patrocinador → aporte → conta → recibo → projeto é rastreável no banco.

#### 4D — Rateio e comprovação física

- **Codex:** rateio persistente, memória de cálculo, soma exata, fontes/projetos e eventos de auditoria; vínculo de fotos, presença, clipping e entrega.
- **Antigravity:** editor de rateio e matriz de comprovação física por lançamento.
- **Aceite:** nenhum botão retorna “sucesso mock”; rateios fecham 100% e permanecem após reload.

---

### Task 5: Governança, risco, exportação e produção

#### Codex — fechamento de produção

- [ ] Implementar RBAC real `ADMIN`, `AUDITOR` e `PRODUTOR`, RLS por organização/projeto e trilha append-only no banco.
- [ ] Recalcular risco após cada importação, OCR, vínculo, correção ou alteração de orçamento.
- [ ] Mapear exportação campo a campo para cada destino realmente suportado; qualquer destino não homologado fica marcado como “prévia”, não “oficial”.
- [ ] Executar testes de autorização negativa, concorrência, recuperação, carga, backup/restore e smoke test completo do Projeto 1961.
- [ ] Publicar primeiro em preview, validar com checklist e somente então promover a produção.

#### Antigravity — apresentação final

**Allowed files:** novos componentes em `src/components/risk/**`, `src/components/export/**` e testes.

- [ ] Criar painel de risco contínuo com severidade, origem, responsável e prazo.
- [ ] Criar central de exportação diferenciando prévia, validado e oficialmente transmitido.
- [ ] Fazer revisão de responsividade, acessibilidade, estados vazios e mensagens de erro.

**Gate 5:** smoke test ponta a ponta aprovado, nenhuma rota demo exposta, dados persistentes, logs/alertas ativos e rollback documentado.

---

## Protocolo obrigatório de handoff

1. Codex cria o pacote da tarefa com base commit, contratos, arquivos permitidos/proibidos e testes de aceite.
2. Antigravity cria `ag/<onda>-<tarefa>` a partir do hash informado. Se não puder usar branch, entrega patch e arquivos; nunca escreve em `main`.
3. Antigravity executa apenas a tarefa recebida e não “aproveita” para refatorar outros módulos.
4. A entrega informa commits, diff, testes, screenshots, limitações e qualquer contrato que não conseguiu cumprir.
5. Codex revisa o diff, procura segredo/dado real, roda lint/test/build e integra por merge normal ou cherry-pick.
6. Codex executa smoke test integrado e registra o resultado no handoff antes de publicar.
7. Falha de contrato volta para a mesma branch do Antigravity; não se abre uma implementação concorrente para o mesmo problema.

## Prompt mestre para Antigravity

```text
Você trabalhará como implementador isolado do Concilia Rouanet.

BASE COMMIT: <HASH_FORNECIDO_PELO_CODEX>
BRANCH OBRIGATÓRIA: ag/<ONDA>-<TAREFA>
OBJETIVO ÚNICO: <OBJETIVO>

ARQUIVOS PERMITIDOS:
<LISTA_EXATA>

ARQUIVOS PROIBIDOS:
- src/App.tsx
- src/services/apiClient.ts
- src/types.ts
- backend/**
- motor/**
- db/** e migrations
- render.yaml e arquivos de deploy
- qualquer arquivo fora da lista permitida

CONTRATOS A CONSUMIR:
<ARQUIVOS E TIPOS CONGELADOS>

REGRAS:
- Não faça deploy, push em main, force push, reset, limpeza ou reformatação global.
- Preserve alterações preexistentes e não invente dados nem regras de negócio.
- Não faça fetch direto: receba dados e callbacks pelas interfaces fornecidas.
- Implemente responsividade, acessibilidade e todos os estados do contrato.
- Adicione testes unitários do componente.

VALIDAÇÃO OBRIGATÓRIA:
npm run lint
npm test -- --run
npm run build

ENTREGA:
1. hash dos commits;
2. arquivos alterados;
3. resumo visual;
4. testes executados e resultado;
5. screenshots desktop/mobile;
6. riscos ou limitações restantes.
Pare após entregar. Não integre nem publique.
```

## Checklist do integrador Codex

- [ ] Confirmar que o diff contém somente arquivos autorizados.
- [ ] Confirmar que não há chaves, tokens, PII, arquivos reais ou payloads OCR.
- [ ] Verificar compatibilidade com o contrato congelado.
- [ ] Rodar testes do componente e testes de regressão do módulo.
- [ ] Rodar lint, suite completa e build.
- [ ] Fazer smoke test local com dados sintéticos e, quando autorizado, com o Projeto 1961.
- [ ] Integrar sem força e publicar somente depois do gate da onda.

## Ordem recomendada

`Onda 0 → Onda 1 → Onda 2 → Onda 3 → Onda 4A/4B → Onda 4C/4D → Onda 5`

O paralelismo começa apenas depois que o Codex congela o contrato de cada onda. Fiscal e orçamento podem avançar em paralelo depois da Onda 3; captação e rateio podem avançar em paralelo depois que seus schemas estiverem aprovados. Deploys intermediários usam preview; produção só ocorre no Gate 5.
