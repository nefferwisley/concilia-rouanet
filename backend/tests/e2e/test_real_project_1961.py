import os
from pathlib import Path
import pytest

from backend.services.file_signature import detect_file_type
from backend.services.workbook_discovery import discover_base_sheet
from backend.services.declared_entries import parse_declared_entries
from backend.services.bank_statement_ingestion import parse_bank_source

REAL_PROJECT_DIR_ENV = os.environ.get("CONCILIA_REAL_PROJECT_DIR")


@pytest.mark.skipif(
    not REAL_PROJECT_DIR_ENV or not Path(REAL_PROJECT_DIR_ENV).exists(),
    reason="CONCILIA_REAL_PROJECT_DIR não configurada ou diretório inexistente.",
)
def test_real_project_folder_inventory_and_ingestion():
    folder_path = Path(REAL_PROJECT_DIR_ENV)
    assert folder_path.is_dir(), f"{folder_path} não é um diretório válido"

    # Coleta todos os arquivos recursivamente
    all_files = [p for p in folder_path.rglob("*") if p.is_file()]
    assert len(all_files) == 211, f"Esperado 211 arquivos no projeto 1961 real, encontrado {len(all_files)}"

    # Localiza a planilha disfarçada 3. 1961.csv
    workbook_files = [f for f in all_files if "1961.csv" in f.name.lower()]
    assert len(workbook_files) >= 1, "Planilha 3. 1961.csv não encontrada"

    wb_path = workbook_files[0]
    content = wb_path.read_bytes()

    # Detecta assinatura real de bytes
    detected = detect_file_type(content, wb_path.name)
    assert detected.kind == "WORKBOOK", f"Esperado WORKBOOK para {wb_path.name}, detectado {detected.kind}"

    # Descobre aba de conciliação
    candidate = discover_base_sheet(content)
    assert candidate is not None, "Aba de conciliação não descoberta na planilha"
    assert candidate.confidence >= 0.5

    # Extrai lançamentos declarados
    entries = parse_declared_entries(content, candidate)
    assert len(entries) > 0, "Nenhum lançamento declarado extraído"

    # Testa extratos bancários se existirem na pasta
    bank_files = [f for f in all_files if f.suffix.lower() in (".ofx", ".csv") and f != wb_path]
    for bf in bank_files:
        b_content = bf.read_bytes()
        movements = parse_bank_source(b_content, bf.name)
        if movements:
            assert all(m.valor is not None for m in movements)
