import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground"
        aria-hidden="true"
      >
        <Compass className="h-8 w-8" strokeWidth={1.5} />
      </div>

      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          That link doesn't lead anywhere. Your reading is waiting where you left it.
        </p>
      </div>

      <Button asChild className="h-11 rounded-xl px-6 font-semibold">
        <Link to="/">Back to today</Link>
      </Button>
    </div>
  );
}
