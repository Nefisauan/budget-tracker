import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { pct, usd } from '../lib/money.ts'

const tooltipStyle = {
  background: '#12121a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 12,
}

export function SplitPie({
  data,
}: {
  data: { key: string; label: string; value: number; color: string }[]
}) {
  const total = data.reduce((n, d) => n + d.value, 0)
  if (total <= 0) {
    return <p className="py-10 text-center text-sm text-mute">Add income and outflows to light the pie.</p>
  }
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_180px] md:items-center">
      <div className="h-[240px]">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={62} outerRadius={92} paddingAngle={3} stroke="none">
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => {
                const n = Number(value ?? 0)
                return [`${usd(n)} · ${pct(n / total)}`, '']
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-mist">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              {d.label}
            </span>
            <span className="text-mute">{pct(d.value / total)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function OwnerBars({
  data,
}: {
  data: { name: string; value: number; fill: string }[]
}) {
  return (
    <div className="h-[220px]">
      <ResponsiveContainer>
        <BarChart data={data} barSize={42}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="name" stroke="#8b8698" tickLine={false} axisLine={false} />
          <YAxis stroke="#8b8698" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => usd(Number(v ?? 0))} />
          <Bar dataKey="value" radius={[12, 12, 4, 4]}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CategoryBars({
  data,
}: {
  data: { name: string; value: number }[]
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-mute">No categories yet.</p>
  }
  return (
    <div className="h-[240px]">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 16, right: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" stroke="#8b8698" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
          <YAxis type="category" dataKey="name" stroke="#8b8698" tickLine={false} axisLine={false} width={88} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => usd(Number(v ?? 0))} />
          <Bar dataKey="value" fill="#e4c37a" radius={[0, 10, 10, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
