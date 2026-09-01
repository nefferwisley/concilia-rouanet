import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EvidenceReviewQueueView } from "./EvidenceReviewQueueView";
import type {
  ReviewQueueItem,
  AuditEventItem,
} from "../../contracts/evidenceReview";

const mockItems: ReviewQueueItem[] = [
  {
    id: "rev-1",
    transacao_id: "tx-1",
    fornecedor: "Mônica Guimarães - Produtora Executiva",
    data_pagamento: "2022-11-04T00:00:00Z",
    valor_bruto: 15000.0,
    documento_id: "doc-1",
    documento_nome: "001 - NF 1020 - Monica Guimaraes.pdf",
    confianca_ocr: 0.78,
    status_revisao: "PENDENTE",
    motivos: ["Valor_Total difere em R$ 0.10"],
    signed_url: "https://storage.supabase.co/signed/doc-1.pdf",
  },
];

const mockAudit: AuditEventItem[] = [
  {
    id: "aud-1",
    entity_type: "EVIDENCE_LINK",
    entity_id: "tx-1",
    action: "APPROVE",
    reason: "Documento conferido pelo auditor",
    actor_id: "usr-admin-1",
    created_at: "2026-09-01T10:00:00Z",
  },
];

describe("EvidenceReviewQueueView", () => {
  it("renders pending review items with values, provider, and confidence percentage", () => {
    const html = renderToStaticMarkup(
      <EvidenceReviewQueueView
        items={mockItems}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(html).toContain("Fila de Revisão Documental");
    expect(html).toContain("Mônica Guimarães - Produtora Executiva");
    expect(html).toContain("78% Confiança");
    expect(html).toContain("Valor_Total difere em R$ 0.10");
    expect(html).toContain("Aprovar Vínculo");
    expect(html).toContain("Rejeitar...");
  });

  it("renders empty state when all items are reviewed", () => {
    const html = renderToStaticMarkup(
      <EvidenceReviewQueueView
        items={[]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(html).toContain("Nenhuma pendência de revisão");
  });
});
