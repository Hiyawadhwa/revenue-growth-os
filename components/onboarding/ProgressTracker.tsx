"use client";

const STEPS = ["Upload", "Review", "Analyze", "Decide", "Report"] as const;

export default function ProgressTracker({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Progress" className="flex items-center gap-2 px-4 py-3 sm:px-8">
      {STEPS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3 | 4 | 5;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium ${
                  active
                    ? "bg-accent text-white"
                    : done
                    ? "bg-base-800 text-ink-mid"
                    : "bg-base-900 text-ink-lo"
                }`}
              >
                {done ? "\u2713" : String(step).padStart(2, "0")}
              </span>
              <span className={`text-xs ${active ? "font-medium text-ink-hi" : "text-ink-lo"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-line sm:w-8" />}
          </div>
        );
      })}
    </nav>
  );
}
