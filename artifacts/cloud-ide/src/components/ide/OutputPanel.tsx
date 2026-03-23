import { useRef, useEffect } from "react";
import { Terminal, Trash2, X } from "lucide-react";
import { useIde } from "@/lib/ide-context";
import { cn } from "@/lib/utils";

export function OutputPanel() {
  const { outputVisible, setOutputVisible, outputMessages, clearOutput } = useIde();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputMessages, outputVisible]);

  if (!outputVisible) return null;

  return (
    <div className="h-64 shrink-0 bg-[#1e1e1e] border-t border-panel-border flex flex-col">
      <div className="h-9 bg-panel border-b border-panel-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Terminal className="w-4 h-4" />
          Output
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={clearOutput}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-panel-hover rounded transition-colors"
            title="Clear Output"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setOutputVisible(false)}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-panel-hover rounded transition-colors"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed select-text"
      >
        {outputMessages.length === 0 ? (
          <div className="text-muted-foreground/50 italic">No output. Run your code to see results here.</div>
        ) : (
          outputMessages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "whitespace-pre-wrap break-words mb-1",
                msg.type === "stderr" && "text-red-400",
                msg.type === "system" && "text-emerald-500 font-bold opacity-80",
                msg.type === "stdout" && "text-foreground"
              )}
            >
              {msg.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
