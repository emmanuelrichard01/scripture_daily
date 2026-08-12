import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface HeaderProps {
  left?: ReactNode;
  right?: ReactNode;
}

export function Header({ left, right }: HeaderProps) {
  return (
    <header className="page-header safe-area-top">
      <div className="page-header-inner justify-between">
        <div className="flex items-center gap-3">
          {left || (
            <Link to="/" className="flex items-center gap-2 group">
              <img 
                src="/apple-touch-icon.png" 
                alt="Logo" 
                className="w-8 h-8 rounded-lg shadow-sm transition-transform group-active:scale-95" 
              />
              <h1 className="text-lg font-heading font-semibold text-foreground tracking-tight">
                Scripture Daily
              </h1>
            </Link>
          )}
        </div>
        
        {right && (
          <div className="flex items-center gap-2">
            {right}
          </div>
        )}
      </div>
    </header>
  );
}