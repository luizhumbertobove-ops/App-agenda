"""Gera o QR code do agendamento online usado no verso do cartão."""
from pathlib import Path

import segno

URL = "https://appbeto-puce.vercel.app/vitrine/agendar"
SAIDA = Path(__file__).with_name("qr-agendamento.svg")


def main() -> None:
    qr = segno.make(URL, error="m")
    qr.save(SAIDA, kind="svg", scale=10, border=2, dark="#000", light="#fff", xmldecl=False)
    print(f"{SAIDA.name}: versão {qr.version}, {qr.symbol_size(border=2)[0] // 1} módulos")


if __name__ == "__main__":
    main()
