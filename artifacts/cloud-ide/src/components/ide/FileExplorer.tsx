import { useState } from "react";
import { FileCode2, FileText, FileJson, FolderOpen, Plus, Trash2, X } from "lucide-react";
import { useGetWorkspace, useCreateFile, useDeleteFile } from "@workspace/api-client-react";
import { useIde } from "@/lib/ide-context";
import { cn, getLanguageFromFilename } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export function FileExplorer() {
  const { activeWorkspaceId, activeFileId, openFile, closeFile } = useIde();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const { data, isLoading } = useGetWorkspace(activeWorkspaceId as number, { 
    query: { enabled: !!activeWorkspaceId } 
  });
  
  const createFileMutation = useCreateFile();
  const deleteFileMutation = useDeleteFile();

  const getFileIcon = (name: string) => {
    if (name.endsWith('.json')) return <FileJson className="w-4 h-4 text-yellow-500" />;
    if (name.endsWith('.md') || name.endsWith('.txt')) return <FileText className="w-4 h-4 text-blue-400" />;
    return <FileCode2 className="w-4 h-4 text-primary" />;
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !activeWorkspaceId) return;

    try {
      const newFile = await createFileMutation.mutateAsync({
        id: activeWorkspaceId,
        data: {
          name: newFileName,
          path: `/${newFileName}`,
          language: getLanguageFromFilename(newFileName),
          content: ""
        }
      });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${activeWorkspaceId}`] });
      setIsCreating(false);
      setNewFileName("");
      openFile(newFile);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFile = async (e: React.MouseEvent, fileId: number) => {
    e.stopPropagation();
    if (!activeWorkspaceId) return;
    try {
      await deleteFileMutation.mutateAsync({ id: activeWorkspaceId, fileId });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${activeWorkspaceId}`] });
      closeFile(fileId);
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
        <FolderOpen className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">Select or create a workspace to view files.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background border-r border-panel-border overflow-hidden">
      <div className="h-10 flex items-center justify-between px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0 border-b border-panel-border">
        <span>Explorer</span>
        <button 
          onClick={() => setIsCreating(true)}
          className="p-1 hover:bg-panel rounded transition-colors hover:text-foreground"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="px-4 py-2 text-sm text-muted-foreground">Loading files...</div>
        ) : (
          <div className="space-y-0.5">
            {data?.files.map(file => (
              <div
                key={file.id}
                onClick={() => openFile(file)}
                className={cn(
                  "group flex items-center justify-between px-4 py-1.5 cursor-pointer text-sm transition-colors",
                  activeFileId === file.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-panel"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  {getFileIcon(file.name)}
                  <span className="truncate">{file.name}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteFile(e, file.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {isCreating && (
              <form onSubmit={handleCreateFile} className="px-4 py-1.5 flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  className="flex-1 bg-panel border border-panel-border rounded px-2 py-0.5 text-sm focus:outline-none focus:border-primary text-foreground"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onBlur={() => !newFileName && setIsCreating(false)}
                  placeholder="filename.ext"
                />
              </form>
            )}
            
            {data?.files.length === 0 && !isCreating && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No files yet.<br />Click + to create one.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
