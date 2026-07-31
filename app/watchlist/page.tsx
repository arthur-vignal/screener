import { Star } from "lucide-react";

export default function WatchlistPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-1px)] px-8">
      <div className="text-center animate-fade-in">
        <Star className="w-8 h-8 text-text-muted mx-auto mb-4" strokeWidth={1.5} />
        <h2 className="text-xl font-medium text-foreground mb-2">Watchlist</h2>
        <p className="text-text-secondary text-sm">Em construção</p>
      </div>
    </div>
  );
}
