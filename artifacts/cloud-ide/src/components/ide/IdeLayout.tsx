import { useIde } from "@/lib/ide-context";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { FileExplorer } from "./FileExplorer";
import { AiPanel } from "./AiPanel";
import { EditorPanel } from "./EditorPanel";
import { OutputPanel } from "./OutputPanel";
import { motion, AnimatePresence } from "framer-motion";

export function IdeLayout() {
  const { leftPanel } = useIde();

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <TopBar />
      
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <Sidebar />
        
        <AnimatePresence initial={false}>
          {leftPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="h-full shrink-0 border-r border-panel-border z-0 bg-background overflow-hidden"
            >
              <div className="w-[280px] h-full">
                {leftPanel === "files" && <FileExplorer />}
                {leftPanel === "ai" && <AiPanel />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col min-w-0 bg-background z-10 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.3)]">
          <EditorPanel />
          <OutputPanel />
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="h-6 bg-primary text-primary-foreground flex items-center justify-between px-3 text-[11px] font-mono shrink-0 select-none">
        <div className="flex items-center gap-4">
          <span>Ready</span>
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>Spaces: 2</span>
        </div>
      </div>
    </div>
  );
}
