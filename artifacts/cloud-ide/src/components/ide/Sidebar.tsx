import { Files, Bot, Settings, LayoutPanelLeft } from "lucide-react";
import { useIde } from "@/lib/ide-context";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { leftPanel, setLeftPanel } = useIde();

  const togglePanel = (panel: "files" | "ai") => {
    if (leftPanel === panel) {
      setLeftPanel(null);
    } else {
      setLeftPanel(panel);
    }
  };

  return (
    <div className="w-12 bg-panel border-r border-panel-border flex flex-col items-center py-4 gap-4 shrink-0 z-10">
      <button
        onClick={() => togglePanel("files")}
        className={cn(
          "p-2.5 rounded-xl transition-all relative group",
          leftPanel === "files" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-panel-hover"
        )}
        title="Explorer"
      >
        <Files className="w-5 h-5" />
        {leftPanel === "files" && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full" />
        )}
      </button>

      <button
        onClick={() => togglePanel("ai")}
        className={cn(
          "p-2.5 rounded-xl transition-all relative group",
          leftPanel === "ai" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-panel-hover"
        )}
        title="AI Assistant"
      >
        <Bot className="w-5 h-5" />
        {leftPanel === "ai" && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full" />
        )}
      </button>

      <div className="mt-auto flex flex-col gap-4">
        <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-panel-hover transition-all">
          <LayoutPanelLeft className="w-5 h-5" />
        </button>
        <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-panel-hover transition-all">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
