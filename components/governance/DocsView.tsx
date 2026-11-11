import { DATASET_INFO, DATA_DICTIONARY, LINEAGE } from "@/lib/governance-docs";
import { RULES } from "@/lib/validation";

export default function DocsView() {
  return (
    <div className="space-y-5">
      <section className="card p-5">
        <p className="step-num">DATASET</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {DATASET_INFO.map((d) => (
            <div key={d.label}>
              <dt className="text-[10px] uppercase tracking-wide text-ink-lo">{d.label}</dt>
              <dd className="mt-0.5 text-sm text-ink-hi">{d.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card p-5">
        <p className="step-num">DATA LINEAGE</p>
        <div className="mt-3 flex flex-wrap items-stretch gap-2">
          {LINEAGE.map((l, i) => (
            <div key={l.step} className="flex items-center gap-2">
              <div className="rounded-xl border border-line bg-base-850 px-3 py-2">
                <p className="text-xs font-semibold text-ink-hi">{l.step}</p>
                <p className="text-[11px] text-ink-lo">{l.detail}</p>
              </div>
              {i < LINEAGE.length - 1 && <span className="text-ink-lo">→</span>}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card overflow-x-auto p-5">
          <p className="step-num">DATA DICTIONARY</p>
          <table className="mt-3 w-full text-left text-xs">
            <tbody>
              {DATA_DICTIONARY.map((c) => (
                <tr key={c.column} className="border-t border-line first:border-0">
                  <td className="py-2 pr-3 font-mono text-ink-hi">{c.column}{c.required && <span className="text-signal-warn"> *</span>}</td>
                  <td className="py-2 pr-3 text-ink-lo">{c.type}</td>
                  <td className="py-2 text-ink-mid">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-ink-lo">* required for a record to be valid</p>
        </section>

        <section className="card overflow-x-auto p-5">
          <p className="step-num">VALIDATION RULES</p>
          <table className="mt-3 w-full text-left text-xs">
            <tbody>
              {RULES.map((r) => (
                <tr key={r.id} className="border-t border-line first:border-0">
                  <td className="py-2 pr-3 font-mono text-ink-mid">{r.id}</td>
                  <td className="py-2 pr-3 text-ink-hi">{r.name}</td>
                  <td className="py-2 text-ink-lo">{r.level} · {r.severity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
