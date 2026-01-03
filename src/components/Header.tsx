import { Link } from "react-router-dom";

interface HeaderProps {
  formattedDate: string;
}

export function Header({ formattedDate }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
        <Link to="/" className="flex flex-col">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Scripture Daily
          </h1>
          <p className="text-2xs text-muted-foreground">{formattedDate}</p>
        </Link>
      </div>
    </header>
  );
}