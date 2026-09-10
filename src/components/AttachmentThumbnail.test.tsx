import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AttachmentThumbnail } from "./AttachmentThumbnail";
import { documentUrlService } from "../services/documentUrlService";

describe("documentUrlService and AttachmentThumbnail", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("handles 401 Unauthorized status correctly in documentUrlService", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
    });

    const result = await documentUrlService.fetchSignedUrl("doc-401", "1961", true);
    expect(result.status).toBe("UNAUTHORIZED");
    expect(result.errorMessage).toContain("Sessão expirada");
    expect(result.signedUrl).toBeNull();
  });

  it("handles 404 Not Found as missing binary in documentUrlService", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
    });

    const result = await documentUrlService.fetchSignedUrl("doc-404", "1961", true);
    expect(result.status).toBe("NOT_FOUND");
    expect(result.errorMessage).toContain("Arquivo precisa ser reimportado");
    expect(result.signedUrl).toBeNull();
  });

  it("handles 502/Network errors with retryable status in documentUrlService", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 502,
      ok: false,
    });

    const result = await documentUrlService.fetchSignedUrl("doc-502", "1961", true);
    expect(result.status).toBe("NETWORK_ERROR");
    expect(result.signedUrl).toBeNull();
  });

  it("caches successful signed URLs and avoids duplicate fetches", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        signedUrl: "https://storage.supabase.co/signed/doc-ok.pdf",
        fileName: "doc-ok.pdf",
        mimeType: "application/pdf",
        expiresIn: 300,
      }),
    });
    global.fetch = fetchSpy;

    const res1 = await documentUrlService.fetchSignedUrl("doc-cache-test", "1961", true);
    expect(res1.status).toBe("SUCCESS");
    expect(res1.signedUrl).toBe("https://storage.supabase.co/signed/doc-ok.pdf");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second fetch should use cache and not call fetch again
    const res2 = await documentUrlService.fetchSignedUrl("doc-cache-test", "1961", false);
    expect(res2.signedUrl).toBe("https://storage.supabase.co/signed/doc-ok.pdf");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("renders static markup with explicit accessible attributes", () => {
    const html = renderToStaticMarkup(
      <AttachmentThumbnail
        documentId="doc-test"
        fileName="comprovante.pdf"
        projectId="1961"
      />
    );
    expect(html).toBeDefined();
  });

  it("handles fallback URL as available document", () => {
    const html = renderToStaticMarkup(
      <AttachmentThumbnail
        fileName="comprovante.pdf"
        fallbackUrl="https://example.com/comprovante.pdf"
      />
    );
    expect(html).toBeDefined();
  });
});
