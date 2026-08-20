from decimal import Decimal
import pytest
from backend.services.bank_statement_ingestion import parse_bank_source, BankMovement


@pytest.fixture
def ofx_sample_bytes():
    return b"""OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>001
<ACCTID>12345-6
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101000000
<DTEND>20240131000000
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115120000[-3:BRT]
<TRNAMT>-1500.50
<FITID>FIT-001
<CHECKNUM>1234
<MEMO>PAGTO FORNECEDOR ALPHA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240116120000[-3:BRT]
<TRNAMT>50000.00
<FITID>FIT-002
<MEMO>CAPTACAO PATROCINIO
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>"""


def test_ofx_fitid_is_the_idempotency_key(ofx_sample_bytes):
    movements = parse_bank_source(ofx_sample_bytes, "extrato.ofx")

    assert len(movements) == 2
    m1 = movements[0]
    assert m1.bank_id == "FIT-001"
    assert m1.data == "2024-01-15"
    assert m1.valor == Decimal("-1500.50")
    assert m1.tipo == "DEBITO"
    assert m1.source_locator == {"kind": "ofx", "fitid": "FIT-001"}

    m2 = movements[1]
    assert m2.bank_id == "FIT-002"
    assert m2.data == "2024-01-16"
    assert m2.valor == Decimal("50000.00")
    assert m2.tipo == "CREDITO"


def test_csv_bank_statement_parsed():
    csv_bytes = (
        "Data,Descricao,Documento,Valor\n"
        "10/01/2024,TRANSFERENCIA ENVIADA,DOC123,-500.00\n"
        "12/01/2024,RENDIMENTO APLICACAO,,15.30\n"
    ).encode("utf-8")

    movements = parse_bank_source(csv_bytes, "extrato.csv")

    assert len(movements) == 2
    assert movements[0].valor == Decimal("-500.00")
    assert movements[0].tipo == "DEBITO"
    assert movements[1].valor == Decimal("15.30")
    assert movements[1].tipo == "CREDITO"
