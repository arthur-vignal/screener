import { PieChart } from "lucide-react";

export default function ETFsScreen() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-1px)] px-8">
      <div className="text-center animate-fade-in">
        <PieChart className="w-8 h-8 text-text-muted mx-auto mb-4" strokeWidth={1.5} />
        <h2 className="text-xl font-medium text-foreground mb-2">ETFs</h2>
        <p className="text-text-secondary text-sm">Em construção</p>
      </div>
    </div>
  );
}
