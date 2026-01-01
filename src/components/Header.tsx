import { Book } from "lucide-react";
import { Link } from "react-router-dom";

interface HeaderProps {
  formattedDate: string;
}

export function Header({ formattedDate }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-lg mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-primary">
            <Book className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold font-serif text-foreground">
              Scripture Daily
            </h1>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
