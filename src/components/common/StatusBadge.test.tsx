import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusBadge, resolveStandardStatus } from "./StatusBadge";
import type { BankTransaction } from "../../types";

describe("StatusBadge", () => {
  it("normalizes internal status strings into canonical presentations", () => {
    expect(resolveStandardStatus("CONCILIADO")).toBe("Conciliado");
    expect(resolveStandardStatus("PENDENTE")).toBe("Pendente");
    expect(resolveStandardStatus("PARCIAL")).toBe("Em revisão");
    expect(resolveStandardStatus("ALERTA_GLOSA")).toBe("Alerta");
    expect(resolveStandardStatus("DIVERGÊNCIA")).toBe("Alerta");
  });

  it("evaluates transaction with fiscal document as Conciliado", () => {
    const tx: BankTransaction = {
      id: "tx-1",
      tipo: "DEBITO",
      valor: 1500,
      status: "CONCILIADO",
      matchedDocId: "doc-1",
    };
    expect(resolveStandardStatus(tx)).toBe("Conciliado");
  });

  it("evaluates transaction with glosa alert as Alerta", () => {
    const tx: BankTransaction = {
      id: "tx-2",
      tipo: "DEBITO",
      valor: 2000,
      status: "ALERTA_GLOSA",
      alertaRisco: "Possível glosa Artigo 28",
    };
    expect(resolveStandardStatus(tx)).toBe("Alerta");
  });

  it("renders with appropriate ARIA label and accessible role", () => {
    const html = renderToStaticMarkup(<StatusBadge status="Conciliado" />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Status: Conciliado"');
    expect(html).toContain("Conciliado");
  });

  it("renders with distinct styling for Pendente and Alerta", () => {
    const pendingHtml = renderToStaticMarkup(<StatusBadge status="Pendente" />);
    expect(pendingHtml).toContain("Pendente");
    expect(pendingHtml).toContain("border-amber-500/50");

    const alertHtml = renderToStaticMarkup(<StatusBadge status="Alerta" />);
    expect(alertHtml).toContain("Alerta");
    expect(alertHtml).toContain("border-rose-500/60");
  });
});
