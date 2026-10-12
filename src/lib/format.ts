/** Formata um valor em reais no padrão "R$ 1.234,00". */
export function formatCurrencyBR(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
