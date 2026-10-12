"use client";

const BAR_WIDTH = 32;
const GAP = 16;
const HEIGHT = 120;
const PADDING_TOP = 8;

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
      >
        {data.map((d, i) => {
          const x = i * (BAR_WIDTH + GAP);
          const barH = Math.max(((d.value / max) * (HEIGHT - PADDING_TOP)), d.value > 0 ? 4 : 0);
          const y = HEIGHT - barH;
          const isLast = i === data.length - 1;

          return (
            <g key={d.label}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={BAR_WIDTH}
                height={barH}
                rx={5}
                className={isLast ? "fill-violet-600" : "fill-violet-200"}
              />
              {/* Value label */}
              {d.value > 0 && (
                <text
                  x={x + BAR_WIDTH / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-gray-500"
                >
                  {d.value >= 1000
                    ? `${(d.value / 1000).toFixed(1)}k`
                    : d.value.toFixed(0)}
                </text>
              )}
              {/* Month label */}
              <text
                x={x + BAR_WIDTH / 2}
                y={HEIGHT + 18}
                textAnchor="middle"
                fontSize={10}
                className={isLast ? "fill-violet-700 font-semibold" : "fill-gray-400"}
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
