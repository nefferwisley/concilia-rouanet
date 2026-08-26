import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import {
  PronacProject,
  BudgetRubric,
  BankTransaction,
  FiscalDocument,
  AuditAlert,
  TripartiteEntry,
} from "../types";
import { formatCurrency, formatDate } from "./formatters";
import { resolveProviderAndCompany } from "./providerHelper";

export function exportTripartiteExcelWorkbook(
  project: PronacProject,
  rubrics: BudgetRubric[],
  transactions: BankTransaction[],
  documents: FiscalDocument[],
  tripartiteEntries: TripartiteEntry[]
) {
  const wb = XLSX.utils.book_new();

  // ABA 1: 01_Orcamento_SALIC
  const orcamentoHeaders = [
    "ID_Rubrica",
    "Etapa",
    "Item_Orcamentario",
    "Valor_Aprovado",
    "Remanejamentos",
    "Orcamento_Atualizado",
    "Valor_Executado",
    "Saldo_Disponivel",
    "%_Executado",
    "Status_Rubrica",
  ];
  const orcamentoRows = rubrics.map((r) => {
    const atualizado = r.valorAprovado;
    const saldoDisp = atualizado - r.valorExecutado;
    const pct = atualizado > 0 ? (r.valorExecutado / atualizado) * 100 : 0;
    const status = saldoDisp < 0 ? "ESTOURO" : saldoDisp === 0 ? "LIQUIDADO" : "DISPONÍVEL";
    return [
      r.id,
      r.etapa,
      r.nome,
      r.valorAprovado,
      0,
      atualizado,
      r.valorExecutado,
      saldoDisp,
      `${pct.toFixed(1)}%`,
      status,
    ];
  });
  const wsOrcamento = XLSX.utils.aoa_to_sheet([orcamentoHeaders, ...orcamentoRows]);
  XLSX.utils.book_append_sheet(wb, wsOrcamento, "01_Orcamento_SALIC");

  // ABA 2: 02_Extrato_BB
  const extratoHeaders = [
    "ID_Transacao_BB",
    "Data_Movimento",
    "Tipo_Transacao",
    "Descricao_Original",
    "Valor_Transacao",
    "Status_Conciliacao",
  ];
  const extratoRows = transactions.map((t) => [
    t.id,
    formatDate(t.data),
    t.tipo,
    t.descricaoExtrato,
    t.tipo === "DEBITO" || t.tipo === "TARIFA" ? -Math.abs(t.valor) : t.valor,
    t.status,
  ]);
  const wsExtrato = XLSX.utils.aoa_to_sheet([extratoHeaders, ...extratoRows]);
  XLSX.utils.book_append_sheet(wb, wsExtrato, "02_Extrato_BB");

  // ABA 3: 03_Documentos_Fiscais
  const docHeaders = [
    "ID_Doc_Fiscal",
    "Tipo_Documento",
    "Numero_Doc",
    "Data_Emissao",
    "Razao_Social_Emitente",
    "CNPJ_CPF_Emitente",
    "Valor_Bruto",
    "Retencao_IRRF",
    "Retencao_INSS",
    "Retencao_ISS",
    "Valor_Liquido_Pagar",
    "Link_Comprovante_GED",
  ];
  const docRows = documents.map((d) => [
    d.id,
    d.tipo,
    d.numeroDoc,
    formatDate(d.dataEmissao),
    d.fornecedorNome,
    d.fornecedorCnpjCpf,
    d.valorBruto,
    d.retencaoIrrf || 0,
    d.retencaoInss || 0,
    d.retencaoIss || 0,
    d.valorLiquido,
    d.arquivoNotaNome || `GED_${d.id}.pdf`,
  ]);
  const wsDocs = XLSX.utils.aoa_to_sheet([docHeaders, ...docRows]);
  XLSX.utils.book_append_sheet(wb, wsDocs, "03_Documentos_Fiscais");

  // ABA 4: 04_Lancamentos_Conciliados
  const lancHeaders = [
    "ID_Lancamento",
    "Periodo",
    "ID_Rubrica",
    "Descricao_Rubrica",
    "ID_Doc_Fiscal",
    "Fornecedor",
    "CNPJ_CPF",
    "ID_Transacao_BB",
    "Data_Compensacao",
    "Valor_Bruto_Doc",
    "Valor_Debito_BB",
    "Status_Tripartite",
    "Status_SALIC",
    "Tripé_Validado",
    "Observacoes",
  ];
  const lancRows = tripartiteEntries.map((l) => [
    l.idLancamento,
    l.periodo,
    l.idRubrica,
    l.descricaoRubrica,
    l.idDocFiscal,
    l.fornecedor,
    l.cnpjCpf,
    l.idTransacaoBB,
    formatDate(l.dataCompensacao),
    l.valorBrutoDoc,
    l.valorDebitoBB,
    l.statusTripartite,
    l.statusSalic,
    l.checkTripe.fiscalDocAnexo && l.checkTripe.comprovanteBancarioAnexo ? "100% OK" : "Incompleto",
    l.observacoes,
  ]);
  const wsLanc = XLSX.utils.aoa_to_sheet([lancHeaders, ...lancRows]);
  XLSX.utils.book_append_sheet(wb, wsLanc, "04_Lancamentos_Conciliados");

  // ABA 5: 05_Dashboard_Saldos
  const dashHeaders = [
    ["PAINEL EXECUTIVO E SALDOS TRIPARTITE - PRONAC " + project.pronac],
    ["Projeto:", project.nome],
    ["Proponente:", project.proponente],
    ["CNPJ:", project.cnpjCpf],
    [],
    ["INDICADOR", "VALOR (R$)", "PERCENTUAL / STATUS"],
    ["Valor Total Aprovado", project.valorAprovado, "100%"],
    ["Valor Total Captado", project.valorCaptado, `${((project.valorCaptado / project.valorAprovado) * 100).toFixed(1)}%`],
    ["Valor Executado (Débitos)", project.valorExecutado, `${((project.valorExecutado / project.valorCaptado) * 100).toFixed(1)}%`],
    ["Saldo Conta Movimento BB", project.bancoInfo.saldoMovimento, "Disponível"],
    ["Rendimento de Aplicação", project.bancoInfo.rendimentoAplicacao, "Fundo BB Curto Prazo"],
    ["Débitos Conciliados", tripartiteEntries.filter((e) => e.statusTripartite.includes("CONCILIADO")).length, "Itens"],
    ["Débitos Pendentes", tripartiteEntries.filter((e) => !e.statusTripartite.includes("CONCILIADO")).length, "Itens"],
  ];
  const wsDash = XLSX.utils.aoa_to_sheet(dashHeaders);
  XLSX.utils.book_append_sheet(wb, wsDash, "05_Dashboard_Saldos");

  const filename = `Planilha_Tripartite_PRONAC_${project.pronac}.xlsx`;
  XLSX.writeFile(wb, filename);
}


export function exportSalicExcel(
  project: PronacProject,
  rubrics: BudgetRubric[],
  transactions: BankTransaction[],
  documents: FiscalDocument[],
  receipts: Record<string, any> = {}
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: 01_Resumo_Execucao_REF
  const resumoData = [
    ["MINISTÉRIO DA CULTURA / ANCINE - RELATÓRIO DE EXECUÇÃO FINANCEIRA (REF)"],
    ["Projeto Cultural:", project.nome],
    ["PRONAC / Registro FSA:", project.pronac],
    ["Proponente / Razão Social:", project.proponente],
    ["CNPJ / CPF:", project.cnpjCpf],
    ["Enquadramento Legal:", project.artigoEnquadramento],
    [""],
    ["CONSOLIDAÇÃO FINANCEIRA"],
    ["Valor Total Aprovado (Captação):", project.valorAprovado || 835000],
    ["Rendimentos de Aplicação Financeira (BB):", project.bancoInfo?.rendimentoAplicacao || 57414.32],
    ["Total de Recursos Disponíveis:", (project.valorAprovado || 835000) + (project.bancoInfo?.rendimentoAplicacao || 57414.32)],
    ["Total de Despesas Executadas:", project.valorExecutado || 897759.15],
    ["Saldo Remanescente a Recolher ao Fundo:", ((project.valorAprovado || 835000) + (project.bancoInfo?.rendimentoAplicacao || 57414.32)) - (project.valorExecutado || 897759.15)],
    [""],
    ["Data de Emissão do Dossiê:", new Date().toLocaleDateString("pt-BR")],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  XLSX.utils.book_append_sheet(wb, wsResumo, "01_Resumo_Execucao");

  // 2. Sheet: 02_Relacao_Pagamentos_REF (Reflexo 1:1 da Esteira de 6 Etapas)
  const pagamentosHeaders = [
    "# Nº",
    "Data do Pagamento",
    "Favorecido (Pessoa Física)",
    "Razão Social / Empresa",
    "CNPJ / CPF Favorecido",
    "FITID / Autenticação BB",
    "Valor Bruto (R$)",
    "Retenções Tributárias (R$)",
    "Valor Líquido Pago (R$)",
    "Documento Fiscal / Recibo",
    "Comprovante Bancário BB",
    "Rubrica Orçamentária",
    "Status de Comprovação",
    "Controle de Assinatura (Júlia)",
  ];

  // Ordenação cronológica estrita
  const debits = transactions
    .filter((t) => t && (t.tipo === "DEBITO" || t.tipoMovimento === "DEBIT" || !t.tipo))
    .sort((a, b) => {
      const dateA = a.data || a.dataTransacao || "";
      const dateB = b.data || b.dataTransacao || "";
      return dateA.localeCompare(dateB);
    });

  const pagamentosRows = debits.map((tx, idx) => {
    const resolved = resolveProviderAndCompany(
      tx.favorecido || tx.descricaoExtrato || "",
      tx.cnpjCpfFavorecido
    );
    const doc = documents.find((d) => d.id === tx.matchedDocId || d.id === tx.idDocumentoFiscalVinculado);
    const rec = receipts[tx.id];
    const rubric = rubrics.find((r) => r.id === tx.matchedRubricId || r.id === doc?.rubricaId);
    const txVal = Number(tx.valor) || 0;

    const temDoc = Boolean(doc || rec?.status === "ASSINADO_ANEXADO");
    const temComp = Boolean(tx.comprovanteUrl || tx.temComprovante || (tx as any).arquivoComprovanteNome);
    const statusComp = temDoc && temComp ? "100% REGULARIZADO" : !temDoc ? "PENDENTE DOC FISCAL" : "PENDENTE COMPROVANTE BB";

    return [
      `#${String(idx + 1).padStart(3, "0")}`,
      formatDate(tx.data || tx.dataTransacao || "2023-01-01"),
      resolved.personName,
      resolved.companyName,
      resolved.cnpjCpf || tx.cnpjCpfFavorecido || "",
      tx.documentoBancario || `DOC-${idx + 1}`,
      Number(doc?.valorBruto) || txVal,
      (Number(doc?.retencaoIss) || 0) + (Number(doc?.retencaoIrrf) || 0) + (Number(doc?.retencaoInss) || 0),
      txVal,
      doc ? `${doc.tipo} nº ${doc.numeroDoc}` : rec ? `Recibo nº ${rec.numeroRecibo}` : "Pendente",
      temComp ? "Anexado" : "Pendente",
      rubric ? `${rubric.itemNumero || ""} ${rubric.nome || rubric.nomeRubrica || ""}`.trim() : "Produção / Execução",
      statusComp,
      rec ? `${rec.status === "ASSINADO_ANEXADO" ? "Assinado" : "Com a Júlia"} (${rec.responsavelAssinatura})` : "Não exigido / NF",
    ];
  });

  const wsPagamentos = XLSX.utils.aoa_to_sheet([pagamentosHeaders, ...pagamentosRows]);
  XLSX.utils.book_append_sheet(wb, wsPagamentos, "02_Relacao_Pagamentos_REF");

  // 3. Sheet: 03_Plano_Orcamentario_20pct
  const rubricasHeaders = [
    "Item",
    "Descrição da Rubrica",
    "Etapa MinC / ANCINE",
    "Total Aprovado (R$)",
    "Total Executado (R$)",
    "Saldo Disponível (R$)",
    "Teto Remanejamento 20% (R$)",
    "% Executado",
    "Status de Conformidade",
  ];

  const rubricasRows = rubrics.map((r) => {
    const vlrAprov = Number(r.valorTotalAprovado ?? r.valorAprovado ?? 0);
    const vlrExec = Number(r.valorExecutado ?? 0);
    const limite20 = Number(r.limiteRemanejamento20pct ?? r.limiteRemanejamento20 ?? vlrAprov * 1.2);
    const saldo = vlrAprov - vlrExec;
    const perc = vlrAprov > 0 ? ((vlrExec / vlrAprov) * 100).toFixed(1) + "%" : "0%";
    let status = "Regular";
    if (vlrAprov > 0 && vlrExec > limite20) {
      status = "GLOSA: Excedeu 20% sem Readequação";
    } else if (vlrAprov > 0 && vlrExec > vlrAprov) {
      status = "Remanejamento Legal (<20%)";
    }

    return [
      r.itemNumero || r.id,
      r.nome || r.nomeRubrica || r.descricaoDetalhada || "Rubrica",
      r.etapa,
      vlrAprov,
      vlrExec,
      saldo,
      limite20,
      perc,
      status,
    ];
  });

  const wsRubricas = XLSX.utils.aoa_to_sheet([rubricasHeaders, ...rubricasRows]);
  XLSX.utils.book_append_sheet(wb, wsRubricas, "03_Orcamento_20pct");

  // 4. Sheet: 04_Controle_Recibos_Assinaturas
  const recibosHeaders = [
    "Nº Recibo",
    "Data Emissão",
    "Favorecido",
    "CPF / CNPJ",
    "Valor (R$)",
    "Função / Serviço Prestado",
    "Rubrica Vinculada",
    "Responsável Assinatura",
    "Status do Fluxo",
  ];

  const recibosRows = Object.values(receipts).map((rec: any) => [
    rec.numeroRecibo,
    formatDate(rec.dataEmissao),
    rec.favorecidoNome,
    rec.favorecidoCpfCnpj,
    rec.valorLiquido,
    rec.funcaoOuServico,
    rec.rubricaNome || "Despesa",
    rec.responsavelAssinatura || "Júlia Bárbara",
    rec.status === "ASSINADO_ANEXADO" ? "Assinado & Regularizado" : rec.status === "ENVIADO_ASSINATURA" ? "Enviado p/ Assinatura" : "Pendente Emissão",
  ]);

  const wsRecibos = XLSX.utils.aoa_to_sheet([recibosHeaders, ...recibosRows]);
  XLSX.utils.book_append_sheet(wb, wsRecibos, "04_Controle_Recibos");

  // Download
  const filename = `REF_SALIC_PRONAC_${project.pronac}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportSalicPdf(
  project: PronacProject,
  rubrics: BudgetRubric[],
  transactions: BankTransaction[],
  documents: FiscalDocument[],
  alerts: AuditAlert[]
) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text("MINISTÉRIO DA CULTURA - SALIC / LEI ROUANET", 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("DOSSIÊ OFICIAL DE PRESTAÇÃO DE CONTAS - LEI 8.313/1991", 14, 22);

  doc.setDrawColor(203, 213, 225);
  doc.line(14, 25, 196, 25);

  // Project Info Box
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Projeto: PRONAC ${project.pronac} - ${project.nome}`, 14, 33);
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Proponente: ${project.proponente} | CNPJ/CPF: ${project.cnpjCpf}`, 14, 39);
  doc.text(
    `Vigência: ${formatDate(project.dataInicioVigencia)} até ${formatDate(project.dataFimVigencia)} | Enquadramento: ${project.artigoEnquadramento}`,
    14,
    44
  );
  doc.text(
    `Banco do Brasil - Ag: ${project.bancoInfo.agencia} | C/C Movimento: ${project.bancoInfo.contaMovimento}`,
    14,
    49
  );

  // Financial summary
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 54, 182, 18, "F");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Valor Aprovado: ${formatCurrency(project.valorAprovado)}`, 18, 62);
  doc.text(`Valor Captado: ${formatCurrency(project.valorCaptado)}`, 75, 62);
  doc.text(`Valor Executado: ${formatCurrency(project.valorExecutado)}`, 135, 62);
  doc.text(`Saldo Restante Movimento: ${formatCurrency(project.bancoInfo.saldoMovimento)}`, 18, 68);
  doc.text(`Rendimentos Aplicação: ${formatCurrency(project.bancoInfo.rendimentoAplicacao)}`, 105, 68);

  // Section: Relação de Pagamentos
  let y = 82;
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text("1. Relação Sintética de Despesas e Comprovantes Conciliados", 14, y);
  y += 6;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Item / Fornecedor", 14, y);
  doc.text("Doc Fiscal", 90, y);
  doc.text("Data Emissão", 125, y);
  doc.text("Valor Pago", 155, y);
  doc.text("Status", 180, y);
  y += 3;
  doc.line(14, y, 196, y);
  y += 4;

  documents.slice(0, 12).forEach((d) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    const fornecedorDisplay = d.fornecedorNome.length > 35 ? d.fornecedorNome.substring(0, 35) + "..." : d.fornecedorNome;
    doc.text(fornecedorDisplay, 14, y);
    doc.text(`${d.tipo.split(" ")[0]} ${d.numeroDoc}`, 90, y);
    doc.text(formatDate(d.dataEmissao), 125, y);
    doc.text(formatCurrency(d.valorLiquido), 155, y);
    doc.text(d.statusComprovacao === "Completo" ? "OK" : "Pendente", 180, y);
    y += 5;
  });

  // Section: Compliance / Audit Summary
  if (y > 230) {
    doc.addPage();
    y = 20;
  } else {
    y += 8;
  }

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text("2. Apontamentos da Auditoria Preventiva MinC (IN nº 01/2023)", 14, y);
  y += 6;

  alerts.forEach((alt) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(8);
    doc.setTextColor(alt.gravidade === "ALTA" ? 185 : alt.gravidade === "MEDIA" ? 202 : 15, alt.gravidade === "ALTA" ? 28 : alt.gravidade === "MEDIA" ? 138 : 23, 28);
    doc.text(`[${alt.gravidade}] ${alt.titulo}`, 14, y);
    y += 4;
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(`Base Legal: ${alt.baseLegal}`, 180);
    doc.text(splitDesc, 14, y);
    y += splitDesc.length * 3.5 + 2;
  });

  // Footer / Signature Section
  if (y > 240) {
    doc.addPage();
    y = 20;
  } else {
    y += 10;
  }
  doc.line(14, y + 15, 95, y + 15);
  doc.line(115, y + 15, 196, y + 15);
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("Assinatura do Proponente Cultural", 25, y + 20);
  doc.text("Contador Responsável (CRC)", 130, y + 20);

  const filename = `Dossie_SALIC_PRONAC_${project.pronac}.pdf`;
  doc.save(filename);
}

export function exportBBGestaoAgilExcel(
  project: PronacProject,
  transactions: BankTransaction[],
  documents: FiscalDocument[]
) {
  const wb = XLSX.utils.book_new();

  const headers = [
    "AGENCIA",
    "CONTA_CORRENTE",
    "DATA_LANCAMENTO",
    "VALOR_LANCAMENTO",
    "TIPO_LANCAMENTO",
    "NATUREZA_LANCAMENTO",
    "CPF_CNPJ_FAVORECIDO",
    "NOME_FAVORECIDO",
    "AUTENTICACAO_BANCARIA",
    "NUMERO_NOTA_FISCAL",
    "CHAVE_ACESSO_NFE",
    "STATUS_COMPROVACAO"
  ];

  const debits = transactions.filter((t) => t && (t.tipo === "DEBITO" || t.tipoMovimento === "DEBIT" || !t.tipo));

  const rows = debits.map(tx => {
    const doc = documents.find((d) => d.id === tx.matchedDocId || d.id === tx.idDocumentoFiscalVinculado);
    return [
      project.bancoInfo?.agencia || "0000",
      project.bancoInfo?.contaMovimento || "000000-0",
      formatDate(tx.data || tx.dataTransacao || ""),
      Number(tx.valor) || 0,
      "D",
      "PAGAMENTO_FORNECEDOR",
      tx.cnpjCpfFavorecido || doc?.fornecedorCnpjCpf || "",
      tx.favorecido || doc?.fornecedorNome || "",
      tx.documentoBancario || "",
      doc?.numeroDoc || "",
      doc?.chaveAcesso || "",
      doc ? "COMPROVADO" : "PENDENTE"
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "BB_Gestao_Agil");

  const filename = `BB_Gestao_Agil_${project.pronac}.xlsx`;
  XLSX.writeFile(wb, filename);
}
