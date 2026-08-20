import io
import zipfile
import pytest
from backend.services.file_signature import detect_file_type, DetectedFileType


def _make_dummy_xlsx_bytes() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", '<Types><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>')
        z.writestr("xl/workbook.xml", "<workbook/>")
    return buf.getvalue()


def test_xlsx_signature_wins_over_csv_extension():
    xlsx_bytes = _make_dummy_xlsx_bytes()
    detected = detect_file_type(xlsx_bytes, "3. 1961.csv")

    assert detected.media_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert detected.kind == "WORKBOOK"


def test_pdf_magic_bytes_detected():
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    detected = detect_file_type(pdf_bytes, "comprovante.pdf")

    assert detected.media_type == "application/pdf"
    assert detected.kind == "PDF"


def test_ofx_header_detected():
    ofx_bytes = b"OFXHEADER:100\r\nDATA:OFXSGML\r\n<OFX><BANKMSGSRSV1></BANKMSGSRSV1></OFX>"
    detected = detect_file_type(ofx_bytes, "extrato.txt")

    assert detected.media_type == "application/x-ofx"
    assert detected.kind == "OFX"


def test_csv_plain_text_detected():
    csv_bytes = "Data;Fornecedor;Valor\n01/01/2026;Empresa ABC;1000,00".encode("utf-8")
    detected = detect_file_type(csv_bytes, "dados.csv")

    assert detected.media_type == "text/csv"
    assert detected.kind == "CSV"
