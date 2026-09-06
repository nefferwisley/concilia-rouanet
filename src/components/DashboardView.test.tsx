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

  it("uses current transactions and warns when the saved snapshot disagrees", () => {
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

    expect(markup).not.toContain("Resumo conferido com os lançamentos");
    expect(markup).toContain("178 de 178");
    expect(markup).toContain("0 itens");
    expect(markup).toContain("R$ 897.759,15");
    expect(markup).not.toContain("R$ 242.417,79");
    expect(markup).toContain("O resumo salvo diverge dos lançamentos atuais");
  });

  it("links the pending card to the transaction list and uses the current pending count", () => {
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
    expect(markup).toContain("Pendentes (0)");
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
  it("shows the share of money rather than the share of transaction rows", () => {
    const markup = render([
      { ...reconciled[0], valor: 999 },
      { ...pending[0], valor: 1 },
    ]);
    expect(markup).toContain("99.9");
    expect(markup).toContain("0.1");
    expect(markup).not.toContain(">50%");
  });
});
