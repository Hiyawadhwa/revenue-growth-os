"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChartPoint } from "@/lib/analysis";

const COLORS = ["#7c6cf6", "#a99dff", "#33d69f", "#f5b94f", "#f45b69", "#4b5075"];

export default function ViewChart({ type, data, title, subtitle }: { type: "bar" | "line" | "pie"; data: ChartPoint[]; title?: string; subtitle?: string }) {
  const tooltipStyle = {
    background: "#171a25",
    border: "1px solid #232636",
    borderRadius: 8,
    fontSize: 12,
    color: "#f3f2fa",
  };

  if (type === "pie") {
    return (
      <div><div className="mb-3"><p className="text-sm font-semibold text-ink-hi">{title}</p>{subtitle && <p className="mt-0.5 text-xs text-ink-lo">{subtitle}</p>}</div><ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer></div>
    );
  }

  if (type === "line") {
    return (
      <div><div className="mb-3"><p className="text-sm font-semibold text-ink-hi">{title}</p>{subtitle && <p className="mt-0.5 text-xs text-ink-lo">{subtitle}</p>}</div><ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#232636" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#63667f", fontSize: 11 }} axisLine={{ stroke: "#232636" }} tickLine={false} />
          <YAxis tick={{ fill: "#63667f", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="value" stroke="#7c6cf6" strokeWidth={2.5} dot={{ r: 3, fill: "#7c6cf6" }} />
        </LineChart>
      </ResponsiveContainer></div>
    );
  }

  return (
    <div><div className="mb-3"><p className="text-sm font-semibold text-ink-hi">{title}</p>{subtitle && <p className="mt-0.5 text-xs text-ink-lo">{subtitle}</p>}</div><ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#232636" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#63667f", fontSize: 11 }} axisLine={{ stroke: "#232636" }} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
        <YAxis tick={{ fill: "#63667f", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#7c6cf61a" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer></div>
  );
}
