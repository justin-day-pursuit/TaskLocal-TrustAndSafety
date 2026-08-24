interface LineChartProps {
  data: { label: string; value: number }[];
  yLabel: string;
  yMin?: number;
  yMax?: number;
  valueFormat?: (value: number) => string;
}

export function LineChart({
  data,
  yLabel,
  yMin = 0,
  yMax,
  valueFormat = (value) => value.toFixed(1),
}: LineChartProps) {
  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 16, bottom: 48, left: 48 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = yMax ?? Math.max(...data.map((point) => point.value), 1);
  const minValue = yMin;
  const range = Math.max(maxValue - minValue, 0.1);

  if (data.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No data points to chart yet.</p>
    );
  }

  const points = data.map((point, index) => {
    const x =
      data.length === 1
        ? padding.left + innerWidth / 2
        : padding.left + (index / (data.length - 1)) * innerWidth;
    const y =
      padding.top + innerHeight - ((point.value - minValue) / range) * innerHeight;
    return { ...point, x, y };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${yLabel} line chart`}
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
        const value = minValue + range * tick;
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
      <polyline
        fill="none"
        stroke="#18181b"
        strokeWidth="2"
        points={polyline}
      />
      {points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle cx={point.x} cy={point.y} r="3.5" fill="#18181b">
            <title>{`${point.label}: ${valueFormat(point.value)}`}</title>
          </circle>
          <text
            x={point.x}
            y={height - 16}
            textAnchor="middle"
            fill="#52525b"
            fontSize="10"
          >
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
