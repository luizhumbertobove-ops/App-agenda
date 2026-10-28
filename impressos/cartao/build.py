"""Gera os arquivos de impressão do cartão a partir de cartao.html.

Saída em saida/: frente.pdf e verso.pdf (CMYK, 94 x 54 mm com 3 mm de sangria),
frente-verniz.pdf e verso-verniz.pdf (máscaras em escala de cinza: preto = verniz),
previa-*.png (recortadas no formato final) e previa-cmyk-*.png (cor depois da conversão).
"""
import glob
import subprocess
import sys
import tempfile
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image

AQUI = Path(__file__).resolve().parent
SAIDA = AQUI / "saida"
HTML = (AQUI / "cartao.html").as_uri()
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
GS_CANDIDATOS = [r"C:\Users\leona\tools\ghostscript\bin\gswin64c.exe", *glob.glob(r"C:\Program Files\gs\gs*\bin\gswin64c.exe")]

PAGINA_PT = (94 / 25.4 * 72, 54 / 25.4 * 72)  # 266,46 x 153,07 pt
PAGINA_PX = (1110, 638)
SANGRIA_PX = 35
FINAL_PX = (1039, 567)

PECAS = [  # (arquivo, parâmetros da página, é máscara?)
    ("frente", "face=frente", False),
    ("verso", "face=verso", False),
    ("frente-verniz", "face=frente&verniz=1", True),
    ("verso-verniz", "face=verso&verniz=1", True),
]


def ghostscript() -> str:
    for g in GS_CANDIDATOS:
        if Path(g).exists():
            return g
    sys.exit("Ghostscript não encontrado (gswin64c.exe)")


def chrome(perfil: Path, *args: str) -> subprocess.CompletedProcess:
    base = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
            "--virtual-time-budget=15000", f"--user-data-dir={perfil}"]
    return subprocess.run(base + list(args), capture_output=True, text=True, encoding="utf-8", errors="replace")


def conferir_fontes(perfil: Path, params: str) -> None:
    dom = chrome(perfil, "--dump-dom", f"{HTML}?{params}").stdout
    if 'data-fontes="ok"' not in dom:
        sys.exit(f"Fontes não carregaram em ?{params} — sem Montserrat/DM Sans o desenho muda. Verifique a internet.")


def recortar_pagina(pdf: Path) -> None:
    """A página do Chrome é maior que o cartão; fixa 94 x 54 mm a partir do canto superior esquerdo."""
    doc = pdfium.PdfDocument(str(pdf))
    pg = doc[0]
    _, _, _, topo = pg.get_mediabox()
    caixa = (0, topo - PAGINA_PT[1], PAGINA_PT[0], topo)
    pg.set_mediabox(*caixa)
    pg.set_cropbox(*caixa)
    doc.save(str(pdf) + ".tmp")
    doc.close()
    Path(str(pdf) + ".tmp").replace(pdf)


def converter(gs: str, origem: Path, destino: Path, mascara: bool) -> None:
    cor = ["-sColorConversionStrategy=Gray", "-sProcessColorModel=DeviceGray"] if mascara else \
          ["-sColorConversionStrategy=CMYK", "-sProcessColorModel=DeviceCMYK"]
    cmd = [gs, "-q", "-dNOPAUSE", "-dBATCH", "-dSAFER", "-sDEVICE=pdfwrite", "-dPDFSETTINGS=/prepress",
           "-dCompatibilityLevel=1.6", "-dEmbedAllFonts=true", "-dSubsetFonts=true", "-dAutoRotatePages=/None",
           *cor, f"-sOutputFile={destino}", str(origem)]
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    if r.returncode != 0 or not destino.exists():
        sys.exit(f"Ghostscript falhou em {destino.name}:\n{r.stderr[-800:]}")


def previa(perfil: Path, params: str, destino: Path) -> None:
    bruto = destino.with_suffix(".bruto.png")
    chrome(perfil, f"--window-size={PAGINA_PX[0]},{PAGINA_PX[1]}", f"--screenshot={bruto}", f"{HTML}?{params}")
    im = Image.open(bruto).convert("RGB")
    s = SANGRIA_PX
    im.crop((s, s, s + FINAL_PX[0], s + FINAL_PX[1])).save(destino, dpi=(300, 300))
    bruto.unlink()


def previa_cmyk(pdf: Path, destino: Path) -> None:
    pg = pdfium.PdfDocument(str(pdf))[0]
    im = pg.render(scale=300 / 72).to_pil().convert("RGB")
    s = round(3 / 25.4 * 300)
    im.crop((s, s, im.width - s, im.height - s)).save(destino, dpi=(300, 300))


def main() -> None:
    gs = ghostscript()
    SAIDA.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        perfil = Path(tmp) / "perfil"
        for nome, params, mascara in PECAS:
            conferir_fontes(perfil, params)
            rgb = Path(tmp) / f"{nome}-rgb.pdf"
            chrome(perfil, "--no-pdf-header-footer", f"--print-to-pdf={rgb}", f"{HTML}?{params}")
            if not rgb.exists():
                sys.exit(f"Chrome não gerou {rgb.name}")
            recortar_pagina(rgb)
            converter(gs, rgb, SAIDA / f"{nome}.pdf", mascara)
            print(f"{nome}.pdf")
        for face in ("frente", "verso"):
            previa(perfil, f"face={face}", SAIDA / f"previa-{face}.png")
            previa_cmyk(SAIDA / f"{face}.pdf", SAIDA / f"previa-cmyk-{face}.png")
        print("prévias geradas")


if __name__ == "__main__":
    main()
