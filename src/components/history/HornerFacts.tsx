import { useState } from "react";
import { Lightbulb, Info, ChevronDown } from "lucide-react";
import { hornerFacts, readingTips } from "@/lib/readingPlan";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { motion } from "framer-motion";

export function HornerFacts() {
  const [expandedTip, setExpandedTip] = useState<number | null>(null);

  return (
    <div className="space-y-6 pb-6">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-foreground tracking-tight">The System</h2>
        </div>
        <div className="grid gap-3">
          {hornerFacts.map((fact, i) => (
            <div key={i} className="card-elevated p-4">
              <h3 className="font-bold text-sm mb-1.5 text-foreground">{fact.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{fact.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-track-yellow" />
          <h2 className="text-base font-bold text-foreground tracking-tight">Tips for Success</h2>
        </div>
        <div className="space-y-2">
          {readingTips.map((tip, i) => (
            <Collapsible
              key={i}
              open={expandedTip === i}
              onOpenChange={() => setExpandedTip(expandedTip === i ? null : i)}
            >
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all focus-ring",
                    expandedTip === i 
                      ? "bg-card border-border shadow-sm" 
                      : "bg-card/50 border-border/50 hover:bg-card hover:border-border"
                  )}
                >
                  <span className="font-semibold text-sm text-foreground">{tip.title}</span>
                  <motion.div
                    animate={{ rotate: expandedTip === i ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-muted-foreground"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <div className="p-4 pt-0 mt-1 text-sm text-muted-foreground leading-relaxed bg-card rounded-b-xl border-x border-b border-border/50 -mt-2">
                  {tip.description}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </section>
    </div>
  );
}
