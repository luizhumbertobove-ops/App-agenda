"""Confere os arquivos de impressão gerados por build.py antes de irem à gráfica.

Sai com código 1 e lista os problemas se algo estiver fora do especificado.
"""
import re
import sys
from pathlib import Path

import pikepdf
import pypdfium2 as pdfium
import zxingcpp
from PIL import Image

PASTA = Path(__file__).with_name("saida")
URL_QR = "https://appbeto-puce.vercel.app/vitrine/agendar"
PAGINA_MM = (94.0, 54.0)
TOLERANCIA_MM = 0.05
ARTES = ("frente", "verso")
MASCARAS = ("frente-verniz", "verso-verniz")
PREVIA_PX = (1039, 567)
OPERADORES_RGB = re.compile(rb"(?<![A-Za-z])(rg|RG)(?![A-Za-z])")

problemas: list[str] = []


def falha(msg: str) -> None:
    problemas.append(msg)


def mm(pt: float) -> float:
    return pt / 72 * 25.4


def render(pdf: Path, dpi: int = 600) -> Image.Image:
    doc = pdfium.PdfDocument(str(pdf))
    return doc[0].render(scale=dpi / 72).to_pil().convert("RGB")


def conferir_pagina(pdf: Path) -> bool:
    if not pdf.exists():
        falha(f"{pdf.name}: não existe")
        return False
    doc = pdfium.PdfDocument(str(pdf))
    if len(doc) != 1:
        falha(f"{pdf.name}: {len(doc)} páginas (esperado 1)")
    w, h = mm(doc[0].get_width()), mm(doc[0].get_height())
    if abs(w - PAGINA_MM[0]) > TOLERANCIA_MM or abs(h - PAGINA_MM[1]) > TOLERANCIA_MM:
        falha(f"{pdf.name}: página {w:.2f} x {h:.2f} mm (esperado {PAGINA_MM[0]} x {PAGINA_MM[1]})")
    return True


def conferir_cmyk_e_fontes(pdf: Path) -> None:
    with pikepdf.open(pdf) as doc:
        for obj in doc.objects:
            if isinstance(obj, pikepdf.Name) or not isinstance(obj, (pikepdf.Dictionary, pikepdf.Stream, pikepdf.Array)):
                continue
            if "/DeviceRGB" in repr(obj) or "/CalRGB" in repr(obj):
                falha(f"{pdf.name}: ainda tem espaço de cor RGB")
                break
        page = doc.pages[0]
        conteudo = b"".join(c.read_bytes() for c in page.get_contents()) if hasattr(page, "get_contents") else page.Contents.read_bytes()
        if OPERADORES_RGB.search(conteudo):
            falha(f"{pdf.name}: conteúdo usa cor RGB (operador rg/RG)")
        fontes = page.Resources.get("/Font", {})
        for nome, fonte in fontes.items():
            if fonte.get("/Subtype") == "/Type3":
                continue
            desc = fonte.get("/FontDescriptor") or fonte.get("/DescendantFonts", [{}])[0].get("/FontDescriptor")
            if not desc or not any(k in desc for k in ("/FontFile", "/FontFile2", "/FontFile3")):
                falha(f"{pdf.name}: fonte {nome} não embutida")


def conferir_bordas(pdf: Path) -> None:
    im = render(pdf)
    w, h = im.size
    px = im.load()
    borda = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    brancos = sum(1 for p in borda if px[p] == (255, 255, 255))
    if brancos:
        falha(f"{pdf.name}: {brancos} pixels brancos na borda (sangria incompleta)")


# Pontos de cor lisa (fração da página) e a cor de tela esperada; a conversão para CMYK
# pode mudar o tom um pouco, nunca virar outra cor.
AMOSTRAS = {
    "frente": [((0.5, 0.92), (0x85, 0x5E, 0x3E))],                               # fundo marrom
    "verso": [((0.3, 0.92), (0xFB, 0xF4, 0xE8)), ((0.88, 0.2), (0x85, 0x5E, 0x3E))],  # creme e coluna
}
TOLERANCIA_COR = 40


def conferir_cores(pdf: Path, face: str) -> None:
    im = render(pdf, dpi=150)
    for (fx, fy), esperado in AMOSTRAS[face]:
        cor = im.getpixel((int(im.width * fx), int(im.height * fy)))
        if max(abs(c - e) for c, e in zip(cor, esperado)) > TOLERANCIA_COR:
            falha(f"{pdf.name}: cor {cor} em ({fx}, {fy}), esperado perto de {esperado}")


def conferir_mascara(pdf: Path) -> None:
    im = render(pdf, dpi=300).convert("L")
    hist = im.histogram()
    total = sum(hist)
    meio = sum(hist[40:216]) / total
    if meio > 0.02:
        falha(f"{pdf.name}: {meio:.1%} dos pixels não são preto nem branco")
    if hist[0] + sum(hist[:40]) == 0:
        falha(f"{pdf.name}: máscara vazia (sem área de verniz)")


def conferir_qr(pdf: Path) -> None:
    lidos = [b.text for b in zxingcpp.read_barcodes(render(pdf))]
    if lidos != [URL_QR]:
        falha(f"{pdf.name}: QR leu {lidos} (esperado {URL_QR})")


def conferir_previas() -> None:
    for nome in ("previa-frente.png", "previa-verso.png"):
        p = PASTA / nome
        if not p.exists():
            falha(f"{nome}: não existe")
        elif Image.open(p).size != PREVIA_PX:
            falha(f"{nome}: {Image.open(p).size} (esperado {PREVIA_PX})")


def main() -> int:
    for nome in ARTES:
        pdf = PASTA / f"{nome}.pdf"
        if conferir_pagina(pdf):
            conferir_cmyk_e_fontes(pdf)
            conferir_bordas(pdf)
            conferir_cores(pdf, nome)
    if (PASTA / "verso.pdf").exists():
        conferir_qr(PASTA / "verso.pdf")
    for nome in MASCARAS:
        pdf = PASTA / f"{nome}.pdf"
        if conferir_pagina(pdf):
            conferir_mascara(pdf)
    conferir_previas()

    if problemas:
        print("FALHOU:")
        for p in problemas:
            print(" -", p)
        return 1
    print("OK: 4 PDFs e 2 prévias conferidos")
    return 0


if __name__ == "__main__":
    sys.exit(main())
