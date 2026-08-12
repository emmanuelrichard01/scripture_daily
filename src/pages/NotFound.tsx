import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Compass, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[60px] -z-10" />

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full z-10 animate-scale-in">
        <div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center mb-8 shadow-sm">
          <Compass className="w-10 h-10 text-primary" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-4xl font-heading font-bold mb-3 tracking-tight">Lost your way?</h1>
        
        <p className="text-muted-foreground font-medium mb-10 max-w-[260px] leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <Button asChild size="lg" className="h-14 rounded-2xl w-full text-lg shadow-lg">
          <Link to="/">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Return to Dashboard
          </Link>
        </Button>
      </main>
    </div>
  );
};

export default NotFound;
