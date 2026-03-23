import { useState } from "react";
import { Play, Plus, ChevronDown, Bot, Loader2 } from "lucide-react";
import { useGetWorkspaces, useGetWorkspace, useExecuteCode, useGetRuntimes } from "@workspace/api-client-react";
import { useIde } from "@/lib/ide-context";
import { WorkspaceModal } from "./WorkspaceModal";
import { getLanguageFromFilename } from "@/lib/utils";

export function TopBar() {
  const { activeWorkspaceId, setActiveWorkspaceId, activeFileId, openFiles, addOutput, clearOutput, setOutputVisible } = useIde();
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: workspacesData } = useGetWorkspaces();
  const { data: workspaceData } = useGetWorkspace(activeWorkspaceId as number, { query: { enabled: !!activeWorkspaceId } });
  const { data: runtimesData } = useGetRuntimes();
  const executeCode = useExecuteCode();

  const activeWorkspace = workspaceData?.workspace;
  const activeFile = openFiles.find(f => f.id === activeFileId);

  const handleRun = async () => {
    if (!activeFile) return;
    
    clearOutput();
    setOutputVisible(true);
    
    const lang = getLanguageFromFilename(activeFile.name);
    const runtime = runtimesData?.runtimes.find(r => r.language === lang || r.aliases.includes(lang));
    
    if (!runtime) {
      addOutput("stderr", `No execution runtime found for language: ${lang}`);
      return;
    }

    addOutput("system", `> Running ${activeFile.name} using ${runtime.language} ${runtime.version}...`);

    try {
      const res = await executeCode.mutateAsync({
        data: {
          language: runtime.language,
          version: runtime.version,
          code: activeFile.content
        }
      });

      if (res.stdout) addOutput("stdout", res.stdout);
      if (res.stderr) addOutput("stderr", res.stderr);
      addOutput("system", `\nProcess exited with code ${res.exitCode} (${res.wallTime}ms)`);
    } catch (err: any) {
      addOutput("stderr", `Execution failed: ${err.message}`);
    }
  };

  return (
    <>
      <header className="h-12 bg-panel border-b border-panel-border flex items-center justify-between px-4 shrink-0 select-none">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            CloudIDE
          </div>

          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-panel-hover transition-colors text-sm font-medium"
            >
              {activeWorkspace ? activeWorkspace.name : "Select Workspace"}
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-panel-border rounded-lg shadow-xl py-2 z-50">
                <div className="px-3 pb-2 mb-2 border-b border-panel-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Workspaces
                </div>
                {workspacesData?.workspaces.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-muted-foreground">No workspaces found</div>
                ) : (
                  workspacesData?.workspaces.map(ws => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspaceId(ws.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${ws.id === activeWorkspaceId ? 'bg-primary/10 text-primary' : 'hover:bg-panel-hover text-foreground'}`}
                    >
                      {ws.name}
                    </button>
                  ))
                )}
                <div className="px-2 pt-2 mt-2 border-t border-panel-border">
                  <button
                    onClick={() => {
                      setModalOpen(true);
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-panel-hover rounded-md transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeFile && (
            <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-md border border-panel-border text-xs text-muted-foreground font-mono">
              {activeFile.name}
            </div>
          )}
          <button
            onClick={handleRun}
            disabled={!activeFile || executeCode.isPending}
            className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-success to-emerald-600 hover:from-success hover:to-emerald-500 text-white rounded-md text-sm font-semibold shadow-lg shadow-success/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {executeCode.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            Run
          </button>
        </div>
      </header>

      <WorkspaceModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
