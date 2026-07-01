'use client';

/**
 * Lightweight chart wrapper for Recharts.
 * Used across analytics, financials, and live ops pages.
 */
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface ChartData {
  label: string;
  value: number;
  value2?: number;
}

interface MiniChartProps {
  data: ChartData[];
  type?: 'area' | 'bar';
  height?: number;
  color?: string;
  color2?: string;
  showGrid?: boolean;
  showAxis?: boolean;
}

export function MiniChart({
  data,
  type = 'area',
  height = 200,
  color = '#16a34a',
  color2 = '#dc2626',
  showGrid = true,
  showAxis = true,
}: MiniChartProps) {
  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
          {showAxis && <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />}
          {showAxis && <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />}
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          {data.some((d) => d.value2 !== undefined) && (
            <Bar dataKey="value2" fill={color2} radius={[4, 4, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
        {showAxis && <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />}
        {showAxis && <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />}
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#colorValue)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
