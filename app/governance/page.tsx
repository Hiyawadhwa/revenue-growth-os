import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import GovernancePanel from "@/components/governance/GovernancePanel";

export default function GovernancePage() {
  return (
    <main className="min-h-screen pb-16">
      <header className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-display text-lg font-bold">Data Quality &amp; Governance</p>
            <p className="text-[11px] text-ink-lo">Validation · Exceptions · Reconciliation · Audit</p>
          </div>
        </div>
        <Link href="/" className="flex items-center gap-1.5 text-xs font-medium text-ink-mid hover:text-accent-soft">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </header>
      <GovernancePanel />
    </main>
  );
}
