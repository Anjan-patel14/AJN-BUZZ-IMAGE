"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, RefreshCw } from "lucide-react";

type Row = { name: string; ok: boolean; detail: string };
function statusDetail(
  name: string,
  responseOk: boolean,
  body: Record<string, unknown>,
  status: number,
) {
  if (!responseOk) return String(body.error || `HTTP ${status}`);
  if (name === "Application")
    return `Ready · ${String(body.public_tools || 11)} image tools`;
  if (name === "Configuration")
    return `Browser processing · ${String(body.batch_limit || 20)} images per run`;
  return "Ready";
}
export function StatusPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true);
    const next: Row[] = [];
    for (const [name, path] of [
      ["Application", "/api/health"],
      ["Configuration", "/api/config"],
    ] as const) {
      try {
        const response = await fetch(path, { cache: "no-store" });
        const body = (await response.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        next.push({
          name,
          ok: response.ok,
          detail: statusDetail(name, response.ok, body, response.status),
        });
      } catch {
        next.push({ name, ok: false, detail: "Unavailable" });
      }
    }
    setRows(next);
    setLoading(false);
  }
  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="status-panel">
      <div className="status-head">
        <div>
          <h2>Local runtime status</h2>
          <p>Refreshes every 30 seconds while this page is open.</p>
        </div>
        <button
          className="btn"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>
      {rows.map((row) => (
        <div className="status-row" key={row.name}>
          {row.ok ? (
            <CheckCircle2 className="status-ok" />
          ) : (
            <CircleAlert className="status-bad" />
          )}
          <div>
            <b>{row.name}</b>
            <span>{row.detail}</span>
          </div>
          <strong>{row.ok ? "Operational" : "Needs attention"}</strong>
        </div>
      ))}
    </div>
  );
}
