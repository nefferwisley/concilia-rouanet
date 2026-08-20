import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { PronacProject } from "../types";
import { FinancialDataGate } from "./FinancialDataGate";

const project: PronacProject = {
  id: "project-empty",
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
  status: "EMPTY",
  resumoProjeto: "",
};

afterEach(cleanup);

it("replaces a financial module with the neutral state when metrics are unavailable", () => {
  render(
    <FinancialDataGate project={project} transactions={[{ id: "tx", tipo: "DEBITO", valor: 1 }]}>
      <div>R$ 1.000,00</div>
    </FinancialDataGate>,
  );

  expect(screen.getByRole("heading", { name: "Ainda não calculado" })).toBeInTheDocument();
  expect(screen.queryByText("R$ 1.000,00")).not.toBeInTheDocument();
});
