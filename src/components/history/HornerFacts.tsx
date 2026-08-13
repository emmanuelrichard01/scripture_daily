import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { hornerFacts, readingTips } from "@/lib/readingPlan";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "about", title: "About the system", items: hornerFacts },
  { id: "tips", title: "How to sustain it", items: readingTips },
] as const;

/** Background reading, collapsed by default so it never competes with the data. */
export function HornerFacts() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section aria-label="About the Horner system" className="space-y-2">
      {SECTIONS.map((section) => {
        const isOpen = openId === section.id;

        return (
          <div
            key={section.id}
            className="overflow-hidden rounded-2xl border border-border/70 bg-card"
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : section.id)}
              aria-expanded={isOpen}
              aria-controls={`facts-${section.id}`}
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-secondary/40 focus-ring"
            >
              <span className="text-sm font-bold">{section.title}</span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>

            {isOpen && (
              <ul id={`facts-${section.id}`} className="space-y-4 border-t border-border/50 p-4">
                {section.items.map((item) => (
                  <li key={item.title}>
                    <h3 className="mb-1 text-sm font-semibold">{item.title}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
