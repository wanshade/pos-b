"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export type SparkRow = { date: string; total: number; orderCount: number };

export function RevenueSparkline({ data }: { data: SparkRow[] }) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0064e0" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#0064e0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="text-muted-foreground/15" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => {
              const d = new Date(v + "T00:00:00");
              return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
            }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) =>
              v >= 1_000_000
                ? `${(v / 1_000_000).toFixed(1)}M`
                : v >= 1_000
                  ? `${Math.round(v / 1_000)}K`
                  : String(v)
            }
          />
          <Tooltip
            formatter={(value) => [`Rp ${Number(value ?? 0).toLocaleString("id-ID")}`, "Revenue"]}
            labelFormatter={(label) => {
              const d = new Date(label + "T00:00:00");
              return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
            }}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid var(--border)",
              fontSize: "12px",
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#0064e0"
            strokeWidth={2}
            fill="url(#revGrad)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
