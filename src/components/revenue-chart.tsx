"use client";

const BAR_WIDTH = 32;
const GAP = 16;
const HEIGHT = 120;
const PADDING_TOP = 8;

/** Valor em milhares com vírgula decimal: 3120 -> "3,1k". Formatação fixa para não divergir entre servidor e cliente. */
function formatK(value: number): string {
  return `${(value / 1000).toFixed(1).replace(".", ",")}k`;
}

export function RevenueChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const totalWidth = data.length * (BAR_WIDTH + GAP) - GAP;

  return (
    <div>
      <svg
        viewBox={`0 0 ${totalWidth} ${HEIGHT + 28}`}
        width="100%"
        height={HEIGHT + 28}
        style={{ display: "block" }}
        role="img"
        aria-label="Receita dos últimos seis meses"
      >
        {/* Linha de base */}
        <line
          x1={0}
          x2={totalWidth}
          y1={HEIGHT}
          y2={HEIGHT}
          strokeWidth={1}
          className="stroke-gray-200"
        />
        {data.map((d, i) => {
          const x = i * (BAR_WIDTH + GAP);
          const barH = Math.max(((d.value / max) * (HEIGHT - PADDING_TOP)), d.value > 0 ? 4 : 0);
          const y = HEIGHT - barH;
          const isLast = i === data.length - 1;

          return (
            <g key={d.label}>
              {/* Barra: mês atual em dourado, os anteriores em marrom claro */}
              <rect
                x={x}
                y={y}
                width={BAR_WIDTH}
                height={barH}
                rx={5}
                className={isLast ? "fill-amber-500" : "fill-violet-400"}
              />
              {/* Valor em "k" acima da barra */}
              {d.value > 0 && (
                <text
                  x={x + BAR_WIDTH / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={500}
                  className="fill-gray-600"
                >
                  {formatK(d.value)}
                </text>
              )}
              {/* Rótulo do mês */}
              <text
                x={x + BAR_WIDTH / 2}
                y={HEIGHT + 18}
                textAnchor="middle"
                fontSize={12}
                fontWeight={isLast ? 600 : 400}
                className={isLast ? "fill-gray-900" : "fill-gray-500"}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
