import { cn } from "@/lib/utils";
import { Zap, Activity, Cpu, Sparkles, FastForward } from "lucide-react";

interface ModelBadgeProps {
  model: string;
  tier: number;
  className?: string;
}

export function ModelBadge({ model, tier, className }: ModelBadgeProps) {
  const getTierDetails = (t: number) => {
    switch (t) {
      case 1:
        return { icon: Sparkles, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", label: "Tier 1: Premium" };
      case 2:
        return { icon: Activity, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", label: "Tier 2: Advanced" };
      case 3:
        return { icon: Cpu, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", label: "Tier 3: Standard" };
      case 4:
        return { icon: Zap, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20", label: "Tier 4: Balanced" };
      case 5:
        return { icon: FastForward, color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/20", label: "Tier 5: Fast Fallback" };
      default:
        return { icon: Cpu, color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/20", label: `Tier ${t}` };
    }
  };

  const details = getTierDetails(tier);
  const Icon = details.icon;

  return (
    <div
      title={details.label}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium cursor-help transition-colors",
        details.bg,
        details.color,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="truncate max-w-[150px]">{model.split('/').pop() || model}</span>
    </div>
  );
}
