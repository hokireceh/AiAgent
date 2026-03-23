import { useState, useEffect } from "react";
import MonacoEditor from "@monaco-editor/react";
import { X, Code2 } from "lucide-react";
import { useIde } from "@/lib/ide-context";
import { cn } from "@/lib/utils";
import { useUpdateFile } from "@workspace/api-client-react";
import { useDebouncedCallback } from "@/hooks/use-debounced-save";

export function EditorPanel() {
  const { activeWorkspaceId, openFiles, activeFileId, setActiveFileId, closeFile } = useIde();
  const updateFileMutation = useUpdateFile();
  const activeFile = openFiles.find(f => f.id === activeFileId);
  
  // Local state for fast typing
  const [localContent, setLocalContent] = useState("");

  useEffect(() => {
    if (activeFile) {
      setLocalContent(activeFile.content);
    } else {
      setLocalContent("");
    }
  }, [activeFile?.id, activeFile?.content]);

  const debouncedSave = useDebouncedCallback((content: string) => {
    if (!activeWorkspaceId || !activeFileId) return;
    updateFileMutation.mutate({
      id: activeWorkspaceId,
      fileId: activeFileId,
      data: { content }
    });
  }, 1000);

  const handleEditorChange = (value: string | undefined) => {
    const val = value || "";
    setLocalContent(val);
    debouncedSave(val);
  };

  if (openFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-muted-foreground/60 min-h-0">
        <Code2 className="w-20 h-20 mb-6 opacity-20" />
        <h2 className="text-xl font-bold tracking-tight text-muted-foreground">CloudIDE</h2>
        <p className="text-sm mt-2">Select a file to start coding</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
      {/* Tabs */}
      <div className="flex overflow-x-auto bg-panel shrink-0 hide-scrollbar">
        {openFiles.map((file) => {
          const isActive = file.id === activeFileId;
          return (
            <div
              key={file.id}
              onClick={() => setActiveFileId(file.id)}
              className={cn(
                "group flex items-center gap-2 px-4 py-2 text-sm border-r border-panel-border cursor-pointer min-w-[120px] max-w-[200px] border-t-2 transition-colors",
                isActive 
                  ? "bg-[#1e1e1e] text-primary border-t-primary" 
                  : "bg-panel text-muted-foreground border-t-transparent hover:bg-panel-hover"
              )}
            >
              <span className="truncate flex-1 font-mono text-xs">{file.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.id);
                }}
                className={cn(
                  "p-0.5 rounded hover:bg-panel-border transition-all",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 relative">
        {activeFile && (
          <MonacoEditor
            theme="vs-dark"
            path={activeFile.path}
            language={activeFile.language}
            value={localContent}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'Fira Code', monospace",
              fontLigatures: true,
              wordWrap: "on",
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              formatOnPaste: true,
            }}
            loading={
              <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] text-muted-foreground">
                Loading editor...
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
