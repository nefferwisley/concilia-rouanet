# Diretrizes e Contexto para Agentes de IA - Concilia Rouanet / SALIC

Este arquivo serve como instrução mestra de contexto e memória para qualquer agente de IA que continuar o desenvolvimento deste projeto.

---

## 1. Identidade e Propósito do Projeto
**Concilia Rouanet & Audiovisual (SALIC / FSA / ANCINE)** é um sistema profissional para prestação de contas, auditoria em tempo real e conciliação bancária tripartite de projetos culturais financiados com incentivos fiscais federais (Lei Rouanet / Art. 18 e Fundo Setorial do Audiovisual - FSA / BRDE / ANCINE).

---

## 2. Princípios Fundamentais do Domínio Financeiro & Cultural

### A. O Tripé de Comprovação SALIC / ANCINE
Toda comprovação de despesa exige correspondência estrita 1:1 ou 1:N entre 3 pilares:
1. **Lançamento no Extrato Bancário (Banco do Brasil):** Débito em conta corrente vinculada com autenticação/FITID e valor líquido pago.
2. **Documento Fiscal Idôneo:** Nota fiscal de serviço (NFS-e), nota mercantil (NF-e) ou RPA com discriminação de retenções tributárias na fonte (ISS, IRRF, INSS).
3. **Rubrica Orçamentária Aprovada:** Item autorizado pelo MinC/ANCINE com seu valor teto aprovado e etapa do plano de trabalho.

### B. Valores Reais Auditados do Projeto Modelo (Projeto 1961)
* **Valor Aprovado (Captação FSA / BRDE):** **R$ 835.000,00** (valor principal contratado).
* **Rendimentos de Aplicação Financeira (BB):** **R$ 57.414,32** (auferidos na conta poupança vinculada).
* **Total de Recursos Disponíveis:** **R$ 892.414,32** (Repasse 835k + Rendimentos).
* **Total de Despesas Executadas:** **R$ 897.759,15** (178 despesas individuais comprovadas).
* **Total de Documentos Fiscais:** **178 documentos** vinculados.

---

## 3. Arquitetura de Skills & Motores Contábeis Instalados

O projeto implementa uma pilha de engenharia financeira inspirada nos melhores padrões da indústria:

1. **TigerBeetle / Pyluca Double-Entry Ledger Engine (`/src/services/reconciliationCore/tigerBeetleLedger.ts`):**
   * Contabilidade estrita por partidas dobradas (`Total Débitos == Total Créditos`).
   * Contas isoladas: `CONTA_VINCULADA_BB`, `CONTA_APLICACAO_POUPANCA_BB`, `RECURSOS_CAPTADOS_FSA`, `RENDIMENTOS_APLICACAO`, `FORNECEDORES_DESPESAS`, `RECEITA_FEDERAL_RETENCOES`, `GLOSAS_BLOQUEADAS`.
   * Chaves determinísticas de idempotência (`idempotencyKey`) para impedir duplicação acidental de transações.

2. **Splink / Fellegi-Sunter Probabilistic Linkage (`/src/services/reconciliationCore/probabilisticMatcher.ts`):**
   * Resolução bayesiana de entidades com ponderação multicritério (Valor 40%, Data 20%, Nome/CNPJ 25%, Documento 10%, Tributos 5%).
   * Classificação em `MATCH_CONFIRMED`, `PROBABLE_MATCH`, `AMBIGUOUS_MULTI_MATCH` e `UNMATCHED`.

3. **Pandera / Great Expectations Data Quality Suite (`/src/services/reconciliationCore/panderaValidationSuite.ts`):**
   * Asserções automatizadas de integridade financeira executadas em tempo real:
     - `expect_total_funding_and_earnings_to_balance`
     - `expect_zero_spreadsheet_totalizer_rows`
     - `expect_net_amount_to_equal_gross_minus_withholdings`
     - `expect_rubric_execution_under_20_percent_reallocation`
     - `expect_unique_bank_fitid_identifiers`

4. **PostgreSQL-Audit Immutable Ledger (`/src/services/reconciliationCore/auditTrailEngine.ts`):**
   * Registro à prova de adulteração com hashes SHA-256, papéis de atores (`AI_AGENT_ENGINE`, `HUMAN_AUDITOR`), timestamps e diffs de estado anterior/novo.

5. **Instructor / Pydantic Pattern Schema Validator (`/src/services/reconciliationCore/schemaValidator.ts`):**
   * Schemas Zod rígidos com autocorreção determinística de datas, moedas e coerência entre Bruto, Retenções e Líquido.

---

## 4. Regras de Ouro de Implementação

1. **Filtragem de Linhas Totalizadoras (Anti-Duplicação):**
   * *Nunca* processe linhas de rodapé de planilhas como lançamentos bancários ou documentos fiscais.
   * Termos como `"PAGAMENTOS REALIZADOS"`, `"TOTAL GERAL"`, `"SUBTOTAL"`, `"TOTAL RENDIMENTO"`, `"SOMA"` devem ser estritamente ignorados pelo parser em `server.ts` e pelas funções de ledger em `src/utils/shadowLedger.ts`.

2. **Exibição Dupla de Favorecidos (Pessoa Física + Pessoa Jurídica):**
   * Sempre utilize a função `resolveProviderAndCompany(...)` localizada em `src/utils/providerHelper.ts`.
   * Em todas as tabelas (Extrato, Conciliação, Documentos, Dashboard), exibir **Nome do Profissional** E **Razão Social da Empresa / CNPJ / CPF**.

3. **Numeração Sequencial:**
   * A primeira coluna de listagens financeiras deve sempre conter a numeração ordenada `# Nº` (`#001`, `#002`, ...).

4. **Contagem e Métricas de Pendências:**
   * Calcular pendências com base estrita nos débitos não conciliados ou sem documento fiscal vinculado (`!tx.matchedDocId && !tx.idDocumentoFiscalVinculado`).
   * Nunca mascarar débitos como `0 pendências` quando houver itens que demandam comprovação.

5. **Gerenciamento de Estado & LocalStorage:**
   * Chaves atuais de armazenamento em `src/App.tsx`: `STORAGE_KEYS` versão `_v4`.
   * Ao inicializar estados do `localStorage`, os arrays devem passar por `isSummaryItem(...)` para higienizar qualquer cache residual antigo.

---

## 5. Mapa da Estrutura de Código

* `/src/App.tsx`: Ponto de entrada, navegação entre abas, gerenciamento do projeto ativo e persistência.
* `/src/components/ReconciliationCoreSkillsView.tsx`: Painel visual interativo com TigerBeetle Ledger, Splink Linkage, Pandera Suite, Trilha de Auditoria e Testador Instructor/Zod.
* `/src/components/DashboardView.tsx`: Painel executivo de indicadores, gráficos de execução por etapa, alertas e resumo de lançamentos.
* `/src/components/ReconciliationView.tsx`: Extrato bancário interativo, filtros por status, ferramentas de vinculação manual e conciliação assistida por IA.
* `/src/components/TripartiteConciliationView.tsx`: Painel visual avançado de conciliação 3 vias, visualizador de comprovantes e matriz de riscos.
* `/src/components/DocumentsView.tsx`: Repositório de documentos fiscais, cálculo de retenções (ISS, IRRF, INSS) e leitor OCR Gemini.
* `/src/components/BudgetPlanView.tsx`: Planilha orçamentária SALIC/ANCINE, controle de remanejamento (limite de 20%) e saldo por rubrica.
* `/src/components/ComplianceAuditView.tsx`: Auditoria de conformidade normativa (IN MinC / Instruções Normativas ANCINE).
* `/src/components/SalicReportView.tsx`: Relatório de Execução Financeira (REF) pronto para exportação.
* `/src/services/reconciliationCore/`: Módulos de motor financeiro (TigerBeetle, Splink, Pandera, AuditTrail, Zod Validator).
* `/src/utils/providerHelper.ts`: Resolvedor canônico de prestadores, diretores, produtoras e empresas de locação/licenciamento.
* `/src/utils/shadowLedger.ts`: Motor inteligente de conciliação e autocorreção (Shadow Ledger).
* `/src/data/mockData.ts`: Base de dados saneada e padronizada.
* `/server.ts`: Backend Express integrado com Google GenAI (`@google/genai`), parser de PDF e APIs de conciliação.

---

## 6. Como Continuar Qualquer Tarefa
1. Consulte este arquivo `AGENTS.md` para respeitar as convenções e métricas do projeto.
2. Execute `npm run lint` ou use `lint_applet` para garantir que os tipos TypeScript estejam consistentes.
3. Utilize `compile_applet` para certificar que o build de produção continua 100% verde.
