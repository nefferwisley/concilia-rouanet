import io
import zipfile
from dataclasses import dataclass
from typing import Literal

FileKind = Literal["WORKBOOK", "PDF", "OFX", "CSV", "IMAGE", "UNKNOWN"]


@dataclass(frozen=True)
class DetectedFileType:
    media_type: str
    kind: FileKind
    extension_hint: str


def detect_file_type(content: bytes, original_name: str = "") -> DetectedFileType:
    if not content:
        return DetectedFileType(media_type="application/octet-stream", kind="UNKNOWN", extension_hint="")

    # 1. Checa PK Zip (OOXML: XLSX, DOCX, etc.)
    if content.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as z:
                names = z.namelist()
                if any("xl/workbook" in n.lower() or "xl/worksheets" in n.lower() for n in names):
                    return DetectedFileType(
                        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        kind="WORKBOOK",
                        extension_hint=".xlsx",
                    )
                if any("word/document" in n.lower() for n in names):
                    return DetectedFileType(
                        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        kind="UNKNOWN",
                        extension_hint=".docx",
                    )
                return DetectedFileType(
                    media_type="application/zip",
                    kind="UNKNOWN",
                    extension_hint=".zip",
                )
        except Exception:
            return DetectedFileType(media_type="application/zip", kind="UNKNOWN", extension_hint=".zip")

    # 2. PDF Magic Bytes
    if content.startswith(b"%PDF-"):
        return DetectedFileType(
            media_type="application/pdf",
            kind="PDF",
            extension_hint=".pdf",
        )

    # 3. OLE Compound Document (Excel 97-2003 .xls)
    if content.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return DetectedFileType(
            media_type="application/vnd.ms-excel",
            kind="WORKBOOK",
            extension_hint=".xls",
        )

    # 4. Imagens comuns
    if content.startswith(b"\xff\xd8\xff"):
        return DetectedFileType(media_type="image/jpeg", kind="IMAGE", extension_hint=".jpg")
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return DetectedFileType(media_type="image/png", kind="IMAGE", extension_hint=".png")
    if content.startswith(b"GIF87a") or content.startswith(b"GIF89a"):
        return DetectedFileType(media_type="image/gif", kind="IMAGE", extension_hint=".gif")

    # 5. OFX Header ou Tags
    sample = content[:4096]
    sample_text = sample.decode("latin-1", errors="ignore")
    if "OFXHEADER" in sample_text or "<OFX>" in sample_text.upper():
        return DetectedFileType(
            media_type="application/x-ofx",
            kind="OFX",
            extension_hint=".ofx",
        )

    # 6. Texto plano / CSV
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = content.decode("latin-1")
        except UnicodeDecodeError:
            return DetectedFileType(media_type="application/octet-stream", kind="UNKNOWN", extension_hint="")

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if lines:
        first_line = lines[0]
        if ";" in first_line or ("," in first_line and not first_line.startswith("<")):
            return DetectedFileType(
                media_type="text/csv",
                kind="CSV",
                extension_hint=".csv",
            )

    return DetectedFileType(
        media_type="application/octet-stream",
        kind="UNKNOWN",
        extension_hint="",
    )
