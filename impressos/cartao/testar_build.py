"""Testes do build e da verificação com entradas defeituosas de propósito.

Cada teste monta um caso que deveria ser reprovado e confere que é. Rode: python testar_build.py
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import build
import verificar

AQUI = Path(__file__).resolve().parent


def teste_fonte_que_nao_carrega_para_o_build(tmp: Path) -> None:
    """Sem acesso ao Google Fonts, o build tem de parar em vez de gerar o cartão em fonte genérica."""
    html = (AQUI / "cartao.html").read_text(encoding="utf-8").replace("fonts.googleapis.com", "fontes.invalido")
    copia = tmp / "cartao.html"
    copia.write_text(html, encoding="utf-8")
    shutil.copy(AQUI / "qr-agendamento.svg", tmp)
    original, build.HTML = build.HTML, copia.as_uri()
    try:
        build.conferir_fontes(tmp / "perfil", "face=frente")
    except SystemExit:
        return
    finally:
        build.HTML = original
    raise AssertionError("conferir_fontes aceitou uma página sem as fontes da marca")


def teste_rgb_dentro_de_xobject_e_reprovado(tmp: Path) -> None:
    """Cor RGB escondida num Form XObject (como o Ghostscript organiza a página) tem de ser achada."""
    rgb = tmp / "rgb.pdf"
    build.chrome(tmp / "perfil", "--no-pdf-header-footer", f"--print-to-pdf={rgb}", f"{build.HTML}?face=verso")
    sem_conversao = tmp / "sem-conversao.pdf"
    subprocess.run([build.ghostscript(), "-q", "-dNOPAUSE", "-dBATCH", "-sDEVICE=pdfwrite",
                    "-sColorConversionStrategy=LeaveColorUnchanged", f"-sOutputFile={sem_conversao}", str(rgb)],
                   check=True)
    verificar.problemas.clear()
    verificar.conferir_cmyk_e_fontes(sem_conversao)
    assert any("RGB" in p for p in verificar.problemas), f"RGB não detectado: {verificar.problemas}"


def teste_qr_em_preto_puro() -> None:
    """Os módulos do QR saem só no preto (K), sem C, M e Y, para não borrar se o registro desviar."""
    verificar.problemas.clear()
    verificar.conferir_preto_puro(verificar.PASTA / "verso.pdf")
    assert not verificar.problemas, verificar.problemas


def main() -> int:
    falhas = 0
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        for teste in (teste_fonte_que_nao_carrega_para_o_build, teste_rgb_dentro_de_xobject_e_reprovado):
            falhas += rodar(teste, tmp)
    falhas += rodar(teste_qr_em_preto_puro)
    print("OK" if not falhas else f"{falhas} teste(s) falharam")
    return 1 if falhas else 0


def rodar(teste, *args) -> int:
    try:
        teste(*args)
        print(f"passou: {teste.__name__}")
        return 0
    except Exception as e:  # noqa: BLE001 — relatório de teste
        print(f"FALHOU: {teste.__name__}: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
