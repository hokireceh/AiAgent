import { Link } from "wouter";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <FileQuestion className="w-24 h-24 text-muted-foreground mx-auto mb-6" />
        <h1 className="text-3xl font-bold tracking-tight mb-2">404 - Page Not Found</h1>
        <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist.</p>
        <Link 
          href="/" 
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Return to IDE
        </Link>
      </div>
    </div>
  );
}
