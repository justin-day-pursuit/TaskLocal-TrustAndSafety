interface BarChartProps {
  data: { label: string; value: number }[];
  yLabel: string;
  valueFormat?: (value: number) => string;
}

export function BarChart({
  data,
  yLabel,
  valueFormat = (value) => String(value),
}: BarChartProps) {
  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 16, bottom: 48, left: 48 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const barWidth = data.length === 0 ? 0 : innerWidth / data.length;
  const gap = Math.min(12, barWidth * 0.28);

  if (data.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No data points to chart yet.</p>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${yLabel} bar chart`}
      className="h-auto w-full"
    >
      <text
        x={12}
        y={padding.top + innerHeight / 2}
        fill="#71717a"
        fontSize="11"
        textAnchor="middle"
        transform={`rotate(-90 12 ${padding.top + innerHeight / 2})`}
      >
        {yLabel}
      </text>
      {[0, 0.5, 1].map((tick) => {
        const y = padding.top + innerHeight - tick * innerHeight;
        const value = maxValue * tick;
        return (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#e4e4e7"
            />
            <text
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              fill="#71717a"
              fontSize="10"
            >
              {valueFormat(value)}
            </text>
          </g>
        );
      })}
      {data.map((point, index) => {
        const barHeight = (point.value / maxValue) * innerHeight;
        const x = padding.left + index * barWidth + gap / 2;
        const y = padding.top + innerHeight - barHeight;
        return (
          <g key={point.label}>
            <rect
              x={x}
              y={y}
              width={Math.max(barWidth - gap, 2)}
              height={barHeight}
              fill="#18181b"
              rx="2"
            >
              <title>{`${point.label}: ${valueFormat(point.value)}`}</title>
            </rect>
            <text
              x={x + (barWidth - gap) / 2}
              y={height - 16}
              textAnchor="middle"
              fill="#52525b"
              fontSize="10"
            >
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
