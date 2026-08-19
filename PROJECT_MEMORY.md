# 🧠 MEMÓRIA CENTRAL DO PROJETO — Concilia Rouanet / RouanetConcilia
> **Instrução para Agentes de IA:** Leia este arquivo PRIMEIRO. Ele contém o estado da arte, regras de ouro e comandos essenciais para economizar tokens e evitar redundâncias.

---

## 🎯 1. Identidade & Modelo de Dados Auditado (Projeto 1961)

- **Domínio:** Prestação de contas e auditoria tripartite de incentivos fiscais federais (Lei Rouanet Art. 18 / Fundo Setorial do Audiovisual - FSA / ANCINE).
- **Projeto Modelo (Canônico):** PRONAC `19-1961/FSA-BRDE` — *1961 (Longa-Metragem Documental)*
  - **Captação Aprovada:** `R$ 835.000,00`
  - **Rendimentos Poupança (BB):** `R$ 57.414,32`
  - **Recursos Totais Disponíveis:** `R$ 892.414,32`
  - **Despesas Executadas / Comprovadas:** `R$ 897.759,15` (178 despesas individuais)
  - **ID do Projeto no Banco:** `19611961-0000-0000-0000-000000001961`

---

## ⚖️ 2. As 5 Regras de Ouro (Invioláveis)

1. **Tripé Tripartite Estrito:** Toda despesa exige correspondência `Extrato BB (FITID)` ↔ `Documento Fiscal (NFS-e/NF-e com tributos)` ↔ `Rubrica Aprovada MinC/FSA`.
2. **Anti-Totalizadores:** NUNCA importar linhas de rodapé ("PAGAMENTOS REALIZADOS", "TOTAL GERAL", "SOMA") como transações.
3. **Resolução Dupla de Favorecidos:** Sempre exibir **Nome do Profissional (PF)** E **Razão Social / CNPJ (PJ)** via `resolveProviderAndCompany` em `src/utils/providerHelper.ts`.
4. **Teto de Remanejamento de 20%:** Variações orçamentárias de até 20% por rubrica são legais (IN 01/2023). Acima disso, exigir readequação SALIC.
5. **Conexão Padronizada do Banco:** Porta PostgreSQL **5432** (`postgresql://rouanet:rouanet_dev_password@localhost:5432/rouanet_concilia`).

---

## 🏗️ 3. Arquitetura da Stack Unificada

| Camada | Stack | Estado |
|---|---|---|
| **Frontend** | React 19 + Vite + Tailwind v4 + TypeScript | 🟢 100% verde (`tsc --noEmit` zerado) |
| **Backend API** | FastAPI + asyncpg + PostgreSQL 16 | 🟢 236/236 testes `pytest` passando |
| **Banco Relacional** | PostgreSQL 16 (18 tabelas + RLS policies) | 🟢 Docker `rouanet_db` porta 5432 |
| **IA Local (Hermes)** | Ollama `qwen2.5-coder:7b` + `qwen2.5vl:7b` | 🟢 Geração e OCR com zero custo de tokens |
| **Terminal CLI** | OpenCode `v1.18.15` | 🟢 Automação de tarefas |

---

## ⚡ 4. Divisão Eficiente de Tarefas entre Agentes (Economia de Tokens)

```mermaid
graph TD
    Antigravity["🪐 Antigravity (Arquiteto Mestre)"] -->|"Planejamento, TypeScript, Integração"| Core
    HermesLocal["🦙 Hermes Local (Qwen 7B)"] -->|"Geração Boilerplate, Testes, OCR sem custo"| Core
    OpenCode["⚡ OpenCode CLI"] -->|"Tarefas autônomas no terminal"| Core
    Core["📁 concilia-rouanet (Repo Unificado)"]
```

---

## ⌨️ 5. Comandos Rápidos e Atalhos

```powershell
# Iniciar a stack completa (Docker + Backend + Frontend):
.\subir_stack.bat

# Rodar Frontend Web:
npm run dev

# Rodar os 236 testes do Backend:
npm run test:backend

# Verificar tipagem TypeScript (deve ser 0 erros):
npm run lint

# Executar prompt no Hermes Local (sem gastar tokens):
python orquestrador_local.py --coder "sua instrucao"

# Obter token JWT de demonstração para testes:
curl -X POST http://localhost:8000/api/v1/dev/demo-login
```

---

## 📌 6. Mapa de Arquivos Principais

- `src/App.tsx`: Ponto de entrada, persistência híbrida e estado central.
- `src/components/Navbar.tsx`: Monitor de status FastAPI / LocalStorage.
- `src/services/apiClient.ts`: Conector assíncrono com a API REST.
- `backend/main.py`: Aplicação FastAPI e 16 routers.
- `backend/routes/auditoria.py`: Motor de auditoria com regras MinC/FSA.
- `backend/scripts/seed_projeto_1961.sql`: Carga dos dados canônicos do Projeto 1961.
- `orquestrador_local.py`: Script de ponte com o Ollama / Qwen 7B.
