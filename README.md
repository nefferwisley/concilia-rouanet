# Concilia Rouanet & Audiovisual (SALIC / FSA / ANCINE)

SaaS completo para gestão orçamentária, conciliação bancária tripartite e auditoria contínua de prestação de contas de projetos culturais e audiovisuais fomentados por leis de incentivo fiscal (Lei Rouanet / Artigo 18 e Fundo Setorial do Audiovisual - FSA / BRDE / ANCINE).

---

## 🚀 Principais Módulos & Skills Integradas

1. **🏛️ TigerBeetle / Pyluca Double-Entry Ledger Engine:** Motor de partidas dobradas com contas segregadas (Conta Vinculada BB, Conta Aplicação, Fundo FSA, Custos, Retenções Tributárias, Glosas) e prevenção rigorosa de duplicidades via chaves de idempotência.
2. **🎯 Splink / Fellegi-Sunter Probabilistic Linkage:** Resolução probabilística de entidades para correspondência automatizada entre débitos bancários e notas fiscais com pesos multivariados (valor líquido, proximidade temporal, similaridade de razão social e CNPJ/CPF).
3. **📋 Pandera & Great Expectations Data Quality Suite:** Bateria de asserções executadas em tempo real para validação da fórmula tributária (`Líquido = Bruto - Retenções`), teto de 20% de remanejamento (MinC Art. 18) e integridade dos recursos.
4. **📜 Trilha de Auditoria Imutável (PostgreSQL-Audit Pattern):** Histórico de eventos com assinaturas criptográficas SHA-256, papéis de atores e registros antes/depois.
5. **📄 Extrator Schema-First (Instructor + Zod Pattern):** Validação estrita de esquemas JSON com auto-correção determinística de valores e datas.
6. **📊 Dashboard Executivo & Conciliação Tripartite:** Indicadores de captação (R$ 835.000,00), rendimentos poupança BB (R$ 57.414,32) e 178 despesas individuais.
7. **📑 Dossiê e Relatório SALIC (REF):** Exportação pronta para apresentação perante o Ministério da Cultura e ANCINE.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Framer Motion, Zod, Fuse.js.
- **Backend:** Express.js, Node.js, `pdf-parse`, `@google/genai` (Gemini API para OCR, conciliação inteligente e pareceres de auditoria).
- **Persistência:** LocalStorage com versionamento e higienização automática de cache.

---

## 📁 Estrutura do Projeto

```text
├── AGENTS.md               # Memória e instruções de contexto para agentes de IA
├── GEMINI.md               # Diretrizes para assistentes Gemini
├── server.ts               # Servidor backend Express (APIs Gemini, OCR e PDF Parse)
├── src/
│   ├── App.tsx             # Componente raiz e navegação
│   ├── components/         # Módulos de visualização (Dashboard, Conciliação, Core Skills, etc.)
│   ├── services/
│   │   └── reconciliationCore/ # Motores contábeis (TigerBeetle, Splink, Pandera, AuditTrail, Zod)
│   ├── data/mockData.ts    # Dados saneados do Projeto 1961
│   ├── types.ts            # Definições de tipos TypeScript
│   └── utils/              # Funções utilitárias (formatters, shadowLedger, providerHelper)
└── package.json            # Dependências e scripts
```

---

## 💻 Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento (Vite + Express).
- `npm run build`: Compila o frontend e o backend para produção.
- `npm run lint`: Executa a verificação estática de tipos com `tsc --noEmit`.
