"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export type ChartRow = { date: string; orderCount: number; total: number };

export function SalesByDayChart({ data }: { data: ChartRow[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" className="text-muted-foreground/20" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(v: string) => {
              const d = new Date(v + "T00:00:00");
              return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
            }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`}
            labelFormatter={(label) => {
              const d = new Date(label + "T00:00:00");
              return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
            }}
          />
          <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
