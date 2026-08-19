# Contexto do Projeto - Gemini AI Coding Assistant

## Sistema: Concilia Rouanet / SALIC & FSA
Este projeto é uma plataforma para prestação de contas de incentivos fiscais (Lei Rouanet / FSA BRDE).

### Regras Críticas de Execução:
1. **Modelo de Dados do Projeto 1961:**
   - Captação Aprovada: R$ 835.000,00
   - Rendimentos Poupança BB: R$ 57.414,32
   - Recursos Totais: R$ 892.414,32
   - Despesas Totais: R$ 897.759,15 (178 despesas individuais)

2. **Parser & Ingestão:**
   - Jamais importar linhas de resumo/totais da planilha (como 'PAGAMENTOS REALIZADOS' ou 'TOTAL GERAL') como transações individuais.

3. **Favorecidos:**
   - Sempre resolver Pessoa Física e Pessoa Jurídica via `resolveProviderAndCompany` em `src/utils/providerHelper.ts`.

4. **UI & Estilo:**
   - Manter tema escuro sofisticado Slate/Emerald, tipografia mono para valores monetários e numeração `# Nº` em todas as tabelas.
