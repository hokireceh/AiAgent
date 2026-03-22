import { useGetUsage, useGetModels } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Server, Activity, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelBadge } from "./model-badge";

interface UsagePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UsagePanel({ isOpen, onClose }: UsagePanelProps) {
  const { data: usageData, isLoading: usageLoading } = useGetUsage({
    query: { enabled: isOpen, refetchInterval: 10000 }
  });
  
  const { data: modelsData, isLoading: modelsLoading } = useGetModels({
    query: { enabled: isOpen }
  });

  const isLoading = usageLoading || modelsLoading;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-card border-l border-border shadow-2xl z-50 overflow-y-auto flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border/50 sticky top-0 bg-card/95 backdrop-blur z-10">
              <div>
                <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" />
                  Cascade System Status
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Real-time model availability & usage</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center flex-1 space-y-4 text-muted-foreground">
                  <Activity className="w-8 h-8 animate-pulse text-primary" />
                  <p>Loading usage statistics...</p>
                </div>
              ) : usageData && modelsData ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-secondary/50 rounded-2xl p-4 border border-border/50">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Total Requests</p>
                      <p className="text-3xl font-display font-bold text-foreground">
                        {usageData.totalRequestsToday.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-secondary/50 rounded-2xl p-4 border border-border/50">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Total Capacity</p>
                      <p className="text-3xl font-display font-bold text-primary">
                        {usageData.totalRemainingToday.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 mt-4">
                    <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      Model Fallback Hierarchy
                    </h3>
                    
                    <div className="space-y-3">
                      {modelsData.models
                        .sort((a, b) => a.tier - b.tier)
                        .map((model) => {
                          const usage = usageData.usage.find(u => u.modelId === model.id) || {
                            requestsToday: model.usedToday,
                            dailyLimit: model.dailyLimit,
                            remainingToday: model.dailyLimit - model.usedToday
                          };
                          
                          const percentUsed = Math.min(100, Math.max(0, (usage.requestsToday / usage.dailyLimit) * 100));
                          
                          let statusColor = "bg-emerald-500";
                          if (percentUsed > 75) statusColor = "bg-amber-500";
                          if (percentUsed > 95) statusColor = "bg-destructive";
                          if (!model.available) statusColor = "bg-muted-foreground";

                          return (
                            <div key={model.id} className={cn(
                              "p-4 rounded-xl border border-border bg-background transition-all",
                              !model.available && "opacity-60 grayscale"
                            )}>
                              <div className="flex justify-between items-start mb-3">
                                <ModelBadge model={model.name} tier={model.tier} />
                                <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                                  {usage.requestsToday.toLocaleString()} / {usage.dailyLimit.toLocaleString()}
                                </span>
                              </div>
                              
                              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentUsed}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className={cn("h-full rounded-full", statusColor)}
                                />
                              </div>
                              
                              <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                                <span>{percentUsed.toFixed(1)}% Used</span>
                                {!model.available ? (
                                  <span className="flex items-center gap-1 text-destructive font-medium">
                                    <AlertCircle className="w-3 h-3" /> Depleted - Falling back
                                  </span>
                                ) : (
                                  <span>{usage.remainingToday.toLocaleString()} left</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Failed to load metrics.
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
