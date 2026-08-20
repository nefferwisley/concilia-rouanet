import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { BudgetRubric, PronacProject } from "../types";
import { DashboardView } from "./DashboardView";

const makeProject = (status: PronacProject["status"]): PronacProject => ({
  id: `project-${status}`,
  pronac: "246810",
  nome: "Projeto online",
  proponente: "Associação Cultural",
  cnpjCpf: "",
  segmento: "Lei Rouanet",
  artigoEnquadramento: "Lei Rouanet",
  dataInicioVigencia: "",
  dataFimVigencia: "",
  prazoLimitePrestacao: "",
  valorAprovado: 1000,
  valorCaptado: 500,
  valorExecutado: 200,
  bancoInfo: {
    banco: "",
    agencia: "",
    contaCaptacao: "",
    contaMovimento: "",
    saldoBloqueado: 0,
    saldoMovimento: 100,
    rendimentoAplicacao: 5,
  },
  status,
  resumoProjeto: "",
});

const unprocessedRubrics: BudgetRubric[] = [
  {
    id: "admin-local",
    etapa: "Custos Administrativos",
    nome: "Administração local",
    valorAprovado: 100,
    valorExecutado: 40,
  },
  {
    id: "div-local",
    etapa: "Divulgação / Comercialização",
    nome: "Divulgação local",
    valorAprovado: 100,
    valorExecutado: 80,
  },
];

const calculatedAdminRubric: BudgetRubric = {
  id: "admin-reviewed",
  etapa: "Custos Administrativos",
  nome: "Administração revisada",
  valorAprovado: 100,
  valorExecutado: 20,
};

afterEach(cleanup);

function renderDashboard(status: PronacProject["status"], rubrics: BudgetRubric[]) {
  render(
    <DashboardView
      project={makeProject(status)}
      rubrics={rubrics}
      transactions={[]}
      documents={[]}
      alerts={[]}
      onNavigateTab={() => undefined}
      onRunAiAudit={() => undefined}
      isAuditing={false}
    />,
  );
}

function getConformityVisual(title: string) {
  const titleElement = screen.getByText(title);
  const card = titleElement.closest("div.bg-slate-900");
  expect(card).not.toBeNull();

  const statusBadge = titleElement.parentElement?.children[1] as HTMLElement | undefined;
  const progressFill = card?.querySelector<HTMLElement>('div[style*="width"]');
  expect(statusBadge).toBeDefined();
  expect(progressFill).not.toBeNull();

  return { statusBadge: statusBadge!, progressFill: progressFill! };
}

it.each(["EMPTY", "IMPORTING"] as const)(
  "keeps $status conformity visuals neutral despite nonzero local percentages",
  (status) => {
    renderDashboard(status, unprocessedRubrics);

    const admin = getConformityVisual("Custos Administrativos (Teto 15%)");
    const disclosure = getConformityVisual("Divulgação & Mídia (Teto 30%)");

    for (const visual of [admin, disclosure]) {
      expect(visual.statusBadge).toHaveTextContent("Ainda não calculado");
      expect(visual.statusBadge).toHaveClass("bg-slate-800", "text-slate-400", "border-slate-700");
      expect(visual.statusBadge).not.toHaveClass("bg-emerald-500/10", "bg-rose-500/10");
      expect(visual.progressFill).toHaveClass("bg-slate-600");
      expect(visual.progressFill).not.toHaveClass("bg-emerald-500", "bg-rose-500", "bg-indigo-500");
      expect(visual.progressFill).toHaveStyle({ width: "0%" });
    }
  },
);

it("releases numeric metrics and calculated conformity visuals for REVIEW with evidence", () => {
  renderDashboard("REVIEW", [calculatedAdminRubric]);

  expect(screen.getAllByText(/R\$\s*1\.000,00/).length).toBeGreaterThan(0);
  const admin = getConformityVisual("Custos Administrativos (Teto 15%)");
  expect(admin.statusBadge).toHaveTextContent("10% / 15%");
  expect(admin.statusBadge).toHaveClass("bg-emerald-500/10", "text-emerald-400");
  expect(admin.progressFill).toHaveClass("bg-emerald-500");
  expect(Number.parseFloat(admin.progressFill.style.width)).toBeCloseTo(66.67, 1);
});
