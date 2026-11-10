import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS } from '../../lib/tones.js';
import { cx, formatCompact, formatCurrency, formatNumber } from '../../lib/format.js';

const axis = { fontSize: 12, fill: '#64748b' };

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-pop">
      {label && <p className="mb-1 text-xs font-semibold text-slate-500">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-2 text-[13px] text-slate-700">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="font-medium">{p.name}</span>
          <span className="font-bold text-ink">{currency ? formatCurrency(p.value) : formatNumber(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function DonutChart({ data, centerValue, centerLabel, size = 150, thickness = 22 }) {
  const items = data.filter((d) => d.value > 0);
  const hasData = items.length > 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={hasData ? items : [{ name: 'None', value: 1 }]} dataKey="value" innerRadius={size / 2 - thickness} outerRadius={size / 2 - 2} paddingAngle={hasData && items.length > 1 ? 2 : 0} stroke="none" startAngle={90} endAngle={-270}>
            {(hasData ? items : [{ color: '#e2e8f0' }]).map((entry, i) => (
              <Cell key={entry.name || i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          {hasData && <Tooltip content={<ChartTooltip />} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-extrabold leading-none text-ink">{centerValue}</span>
        {centerLabel && <span className="mt-1 text-xs text-slate-500">{centerLabel}</span>}
      </div>
    </div>
  );
}

export function Legend({ items, format = formatNumber, className }) {
  return (
    <ul className={cx('min-w-0 flex-1 space-y-2.5', className)}>
      {items.map((item, i) => (
        <li key={item.name} className="flex items-center gap-2.5 text-[13px]">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: item.color || CHART_COLORS[i % CHART_COLORS.length] }} />
          <span className="flex-1 truncate text-slate-600">{item.name}</span>
          {item.extra && <span className="text-slate-400">{item.extra}</span>}
          <span className="font-semibold text-ink">{format(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export function DonutWithLegend({ data, centerValue, centerLabel, format, size = 140 }) {
  const colored = data.map((d, i) => ({ ...d, color: d.color || CHART_COLORS[i % CHART_COLORS.length] }));
  return (
    <div className="flex flex-wrap items-center gap-6">
      <DonutChart data={colored} centerValue={centerValue} centerLabel={centerLabel} size={size} />
      <Legend items={colored} format={format} />
    </div>
  );
}

export function TrendChart({ data, xKey = 'label', series, height = 260, currency }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color || CHART_COLORS[i]} stopOpacity={0.28} />
                <stop offset="100%" stopColor={s.color || CHART_COLORS[i]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey={xKey} tick={axis} tickLine={false} axisLine={false} />
          <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => (currency ? `₹${formatCompact(v)}` : formatCompact(v))} width={currency ? 56 : 40} />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          {series.map((s, i) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color || CHART_COLORS[i]} strokeWidth={2.5} fill={`url(#grad-${s.key})`} dot={false} activeDot={{ r: 4 }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({ data, xKey = 'label', series, height = 260, currency, layout = 'horizontal' }) {
  const vertical = layout === 'vertical';
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={vertical ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 8, left: vertical ? 24 : -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={!vertical} vertical={vertical} />
          {vertical ? (
            <>
              <XAxis type="number" tick={axis} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey={xKey} tick={axis} tickLine={false} axisLine={false} width={150} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={axis} tickLine={false} axisLine={false} />
              <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => (currency ? `₹${formatCompact(v)}` : formatCompact(v))} width={currency ? 56 : 40} />
            </>
          )}
          <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: 'rgba(47,109,243,.06)' }} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color || CHART_COLORS[i]} radius={vertical ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={32} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
