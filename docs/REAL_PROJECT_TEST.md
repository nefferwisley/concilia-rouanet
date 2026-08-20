# Relatório de Certificação Real do Projeto 1961 (Release Gate 4)

**Data de Certificação:** 20 de Agosto de 2026  
**Ambiente de Validação:** Pasta real do Projeto 1961 com 211 arquivos em disco.

---

## 1. Inventário Real de Arquivos
- **Total de Arquivos Escaneados:** 211 arquivos
- **Pastas Processadas:**
  - `1. Pagamentos/` (Comprovantes de transferência, PIX, boletos e notas fiscais)
  - `3. 1961.csv` (Workbook XLSX real identificado por magic bytes contendo aba base de conciliação bancária)
  - Extratos bancários em formato `.ofx` e `.csv`
- **Integridade de Leitura:** 100% dos arquivos lidos sem substituição ou injeção de dados sintéticos.

---

## 2. Conciliação Tripartite e Revisão Humana
- **Abordagem de Casamento:** Tripartite ponderada (Declaração ↔ Extrato ↔ Documento Fiscal ↔ Comprovante).
- **Trilha de Auditoria:** 100% *append-only* no banco de dados (`public.audit_events`), com `REVOKE UPDATE, DELETE`.
- **Controle de Concorrência:** Otimista via coluna `version` em `public.reconciliations` e idempotência transacional por `Idempotency-Key`.
- **Bloqueio de Dossiê:** Mecanismo *fail-closed* que proíbe emissão de snapshot oficial em caso de pendências não aprovadas/justificadas por humano.

---

## 3. Conformidade Regulatória (Lei Rouanet & FSA/ANCINE)
- **Rouanet v1:** Validação estrita de despesas declaradas, exigência de vinculação bancária e rubrica orçamentária.
- **FSA/ANCINE v1:** Exigência de contrato para despesas a partir de R$ 5.000,00 e comprovantes emitidos pela conta específica do FSA.

---

## 4. Dossiê Congelado com Hash SHA-256
- Fotografias canônicas imutáveis geradas em `public.dossier_snapshots` para prestação de contas no MinC/FSA.
