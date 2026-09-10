import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BankTransaction, PronacProject } from "../types";
import { initialDocuments, initialProjects, initialRubrics, initialTransactions } from "../data/mockData";
import { DashboardView } from "./DashboardView";

const project: PronacProject = {
  id: "project-1961",
  pronac: "20-7453",
  nome: "1961 - Circunstância Cinematográfica",
  proponente: "Circunstância Produções Ltda",
  cnpjCpf: "00.000.000/0001-00",
  segmento: "Audiovisual",
  artigoEnquadramento: "Artigo 18 (100% Renúncia)",
  dataInicioVigencia: "2022-10-31",
  dataFimVigencia: "2024-12-31",
  prazoLimitePrestacao: "2025-03-31",
  valorAprovado: 835_000,
  valorCaptado: 835_000,
  valorExecutado: 897_759.15,
  bancoInfo: {
    banco: "Banco do Brasil",
    agencia: "0000-0",
    contaMovimento: "8768-8",
    contaCaptacao: "0000-0",
    saldoBloqueado: 0,
    saldoMovimento: 5_344.83,
    rendimentoAplicacao: 57_414.32,
    extratoBancarioImportado: true,
  },
  status: "Em execução",
  resumoProjeto: "Projeto 1961",
};

const reconciled: BankTransaction[] = [
  ...Array.from({ length: 95 }, (_, index) => ({
    id: `reconciled-${index}`,
    tipo: "DEBITO",
    valor: 6_500,
    status: "CONCILIADO",
    matchedDocId: `doc-${index}`,
  })),
  {
    id: "reconciled-final",
    tipo: "DEBITO",
    valor: 37_841.36,
    statusConciliacao: "Conciliado",
    idDocumentoFiscalVinculado: "doc-final",
  },
];

const pending: BankTransaction[] = [
  ...Array.from({ length: 81 }, (_, index) => ({
    id: `pending-${index}`,
    tipo: "DEBITO",
    valor: 2_900,
    status: "PENDENTE",
  })),
  { id: "pending-final", tipo: "DEBITO", valor: 7_517.79, status: "PENDENTE" },
];

describe("DashboardView reconciliation summary", () => {
  it("shows the captured-budget card alongside the reconciliation summary", () => {
    const markup = renderToStaticMarkup(
      <DashboardView
        project={project}
        rubrics={[]}
        transactions={[...reconciled, ...pending]}
        documents={[]}
        alerts={[]}
        onNavigateTab={() => undefined}
        onRunAiAudit={() => undefined}
        isAuditing={false}
      />,
    );

    expect(markup).toContain("Orçamento Aprovado");
    expect(markup).toContain("Orçamento Captado");
    expect(markup).toContain("Captação registrada");
    expect(markup).toContain("Conciliado (par completo)");
    expect(markup).toContain("96 de 178");
    expect(markup).toContain("Pendente de comprovação");
    expect(markup).toContain("82 itens");
    expect(markup).toContain("Saldo em Conta");
  });

  it("treats a missing legacy statement flag as unknown, never as imported evidence", () => {
    const projectWithUnknownStatement = {
      ...project,
      bancoInfo: {
        ...project.bancoInfo,
        extratoBancarioImportado: undefined,
      },
    };
    const markup = renderToStaticMarkup(
      <DashboardView
        project={projectWithUnknownStatement}
        rubrics={[]}
        transactions={reconciled}
        documents={[]}
        alerts={[]}
        onNavigateTab={() => undefined}
        onRunAiAudit={() => undefined}
        isAuditing={false}
      />,
    );

    expect(markup).toContain("Nenhum extrato importado");
    expect(markup).toContain("Validação bancária indisponível sem extrato");
    expect(markup).toContain("Saldo não informado");
    expect(markup).not.toContain("96/96 débitos vinculados");
  });

  it("does not present a project balance as real before a bank statement is imported", () => {
    const projectWithoutStatement = {
      ...project,
      bancoInfo: {
        ...project.bancoInfo!,
        extratoBancarioImportado: false,
      }
    };
    const markup = renderToStaticMarkup(
      <DashboardView
        project={projectWithoutStatement}
        rubrics={[]}
        transactions={[]}
        documents={[]}
        alerts={[]}
        onNavigateTab={() => undefined}
        onRunAiAudit={() => undefined}
        isAuditing={false}
      />,
    );

    expect(markup).toContain("Saldo não informado");
    expect(markup).toContain("Conta não informada");
    expect(markup).toContain("Importe o extrato bancário");
    expect(markup).not.toContain("R$ 5.344,83");
  });

  it("keeps audit and dossier blocked until their evidence is explicitly complete", () => {
    const markup = renderToStaticMarkup(
      <DashboardView
        project={project}
        rubrics={initialRubrics["proj-1961"] || []}
        transactions={reconciled}
        documents={initialDocuments["proj-1961"] || []}
        alerts={[]}
        onNavigateTab={() => undefined}
        onRunAiAudit={() => undefined}
        isAuditing={false}
      />,
    );

    expect(markup).toContain("Auditoria ainda não concluída");
    expect(markup).toContain("Bloqueado até concluir as etapas anteriores");
    expect(markup).not.toContain("Pronto para exportação oficial");
  });

  it("uses the validated summary when its count and executed total match the imported ledger", () => {
    const localTransactions = [...reconciled, ...pending].map((transaction, index) => ({
      ...transaction,
      status: "CONCILIADO",
      statusConciliacao: "Conciliado",
      matchedDocId: transaction.matchedDocId || `local-doc-${index}`,
    }));
    const projectWithValidatedSummary: PronacProject = {
      ...project,
      resumoFinanceiroValidado: {
        totalExecutado: 897_759.15,
        totalConciliado: 655_341.36,
        totalAConciliar: 242_417.79,
        debitCount: 178,
        reconciledDebitCount: 96,
        pendingDebitCount: 82,
        fonte: "Revisão documental validada",
      },
    };

    const markup = renderToStaticMarkup(
      <DashboardView
        project={projectWithValidatedSummary}
        rubrics={[]}
        transactions={localTransactions}
        documents={[]}
        alerts={[]}
        onNavigateTab={() => undefined}
        onRunAiAudit={() => undefined}
        isAuditing={false}
      />,
    );

    expect(markup).toContain("Resumo validado");
    expect(markup).toContain("96 de 178");
    expect(markup).toContain("82 itens");
    expect(markup).toContain("R$ 655.341,36");
    expect(markup).toContain("R$ 242.417,79");
    expect(markup).toContain("Os vínculos locais ainda divergem do resumo validado");
  });

  it("links the pending card to the transaction list and keeps the validated pending count", () => {
    const localTransactions = [...reconciled, ...pending].map((transaction, index) => ({
      ...transaction,
      status: "CONCILIADO",
      statusConciliacao: "Conciliado",
      matchedDocId: transaction.matchedDocId || `local-doc-${index}`,
    }));
    const projectWithValidatedSummary: PronacProject = {
      ...project,
      resumoFinanceiroValidado: {
        totalExecutado: 897_759.15,
        totalConciliado: 655_341.36,
        totalAConciliar: 242_417.79,
        debitCount: 178,
        reconciledDebitCount: 96,
        pendingDebitCount: 82,
        fonte: "Revisão documental validada",
      },
    };

    const markup = renderToStaticMarkup(
      <DashboardView
        project={projectWithValidatedSummary}
        rubrics={[]}
        transactions={localTransactions}
        documents={[]}
        alerts={[]}
        onNavigateTab={() => undefined}
        onRunAiAudit={() => undefined}
        isAuditing={false}
      />,
    );

    expect(markup).toContain('aria-controls="project-transactions"');
    expect(markup).toContain('id="project-transactions"');
    expect(markup).toContain("Pendentes (82)");
  });

  it("offers access to every filtered pending transaction instead of hiding after ten rows", () => {
    const markup = renderToStaticMarkup(
      <DashboardView
        project={project}
        rubrics={[]}
        transactions={pending}
        documents={[]}
        alerts={[]}
        onNavigateTab={() => undefined}
        onRunAiAudit={() => undefined}
        isAuditing={false}
      />,
    );

    expect(markup).toContain("Mostrar todos os 82");
  });

  it("offers practical expense categories with their verified pending counts", () => {
    const project1961 = initialProjects.find((item) => item.id === "proj-1961");
    expect(project1961).toBeDefined();

    const markup = renderToStaticMarkup(
      <DashboardView
        project={project1961!}
        rubrics={initialRubrics["proj-1961"]}
        transactions={initialTransactions["proj-1961"]}
        documents={initialDocuments["proj-1961"]}
        alerts={[]}
        onNavigateTab={() => undefined}
        onRunAiAudit={() => undefined}
        isAuditing={false}
      />,
    );

    expect(markup).toContain("Categoria da despesa");
    expect(markup).toContain("Alimentação e diárias (25)");
    expect(markup).toContain("Passagens aéreas (8)");
  });

  it("renders the expected FSA 1961 mobile summary", () => {
    const project1961 = initialProjects.find((item) => item.id === "proj-1961");
    expect(project1961).toBeDefined();

    const markup = renderToStaticMarkup(
      <DashboardView
        project={project1961!}
        rubrics={initialRubrics["proj-1961"]}
        transactions={initialTransactions["proj-1961"]}
        documents={initialDocuments["proj-1961"]}
        alerts={[]}
        onNavigateTab={() => undefined}
        onRunAiAudit={() => undefined}
        isAuditing={false}
      />,
    );

    expect(markup).toContain("FSA / ANCINE");
    expect(markup).toContain("R$ 835.000,00");
    expect(markup).toContain("100% Liberado p/ Execução");
    expect(markup).toContain("Conciliado (par completo)");
    expect(markup).toContain("96 de 178");
    expect(markup).toContain("R$ 655.341,36");
    expect(markup).toContain("Pendente de Cobrança");
    expect(markup).toContain("82 itens");
    expect(markup).toContain("R$ 242.417,79");
    expect(markup).toContain("Falta Nota Fiscal / Bilhete / Recibo");
    expect(markup).toContain("BB 8768-8");
    expect(markup).toContain("110.401");
    expect(markup).not.toContain("Documento:");
    expect(markup).toContain("hidden sm:block");
  });
});


describe("Dashboard monetary integrity", () => {
  const render = (transactions: BankTransaction[]) => renderToStaticMarkup(
    <DashboardView project={project} rubrics={[]} transactions={transactions}
      documents={[]} alerts={[]} onNavigateTab={() => undefined}
      onRunAiAudit={() => undefined} isAuditing={false} />,
  );
  it("does not reuse project execution when the current list is empty", () => {
    expect(render([])).not.toContain("897.759,15");
  });
  it("does not use a validated snapshot for a different ledger", () => {
    const mismatchedProject: PronacProject = {
      ...project,
      resumoFinanceiroValidado: {
        totalExecutado: 897_759.15,
        totalConciliado: 655_341.36,
        totalAConciliar: 242_417.79,
        debitCount: 178,
        reconciledDebitCount: 96,
        pendingDebitCount: 82,
        fonte: "Revisão documental validada",
      },
    };
    const markup = renderToStaticMarkup(
      <DashboardView project={mismatchedProject} rubrics={[]} transactions={[reconciled[0]]}
        documents={[]} alerts={[]} onNavigateTab={() => undefined}
        onRunAiAudit={() => undefined} isAuditing={false} />,
    );
    expect(markup).not.toContain("R$ 655.341,36");
    expect(markup).not.toContain("R$ 242.417,79");
  });

  it("renders 3-second decision matrix, monthly reconciliation chart, and balance evolution", () => {
    const markup = renderToStaticMarkup(
      <DashboardView
        project={project}
        rubrics={initialRubrics["proj-1961"] || []}
        transactions={[...reconciled, ...pending]}
        documents={initialDocuments["proj-1961"] || []}
        alerts={[]}
        onNavigateTab={() => undefined}
        onRunAiAudit={() => undefined}
        isAuditing={false}
      />,
    );

    expect(markup).toContain("Painel de Decisão Imediata (≤ 3s)");
    expect(markup).toContain("Valor em Risco");
    expect(markup).toContain("Sem Nota Fiscal");
    expect(markup).toContain("Comp. Bancários");
    expect(markup).toContain("Evolução Mensal de Conciliação");
    expect(markup).toContain("Linha Temporal do Saldo em Conta");
  });

  it("puts operational priorities before the collapsible workflow guide", () => {
    const markup = renderToStaticMarkup(
      <DashboardView
        project={project}
        rubrics={[]}
        transactions={[...reconciled, ...pending]}
        documents={[]}
        alerts={[]}
        onNavigateTab={() => undefined}
        onRunAiAudit={() => undefined}
        isAuditing={false}
      />,
    );

    expect(markup).toContain("Prioridades de Hoje");
    expect(markup).toContain("Resolver pendências");
    expect(markup).toContain("<details");
    expect(markup.indexOf("Prioridades de Hoje")).toBeLessThan(markup.indexOf("Guia Passo a Passo da Prestação de Contas SALIC"));
  });
});
