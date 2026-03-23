import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useCreateWorkspace } from "@workspace/api-client-react";
import { useIde } from "@/lib/ide-context";
import { useQueryClient } from "@tanstack/react-query";

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkspaceModal({ isOpen, onClose }: WorkspaceModalProps) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("python");
  const [description, setDescription] = useState("");
  const { setActiveWorkspaceId } = useIde();
  const queryClient = useQueryClient();
  const createMutation = useCreateWorkspace();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const workspace = await createMutation.mutateAsync({
        data: { name, language, description }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      setActiveWorkspaceId(workspace.id);
      setName("");
      setDescription("");
      onClose();
    } catch (err) {
      console.error("Failed to create workspace", err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-panel border-panel-border text-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create Workspace</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Set up a new environment for your code.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Workspace Name</label>
            <input
              autoFocus
              className="w-full px-3 py-2 bg-background border border-panel-border rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="e.g. My Next JS Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Primary Language</label>
            <select
              className="w-full px-3 py-2 bg-background border border-panel-border rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript / Node</option>
              <option value="typescript">TypeScript</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="php">PHP</option>
              <option value="ruby">Ruby</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Optional)</label>
            <input
              className="w-full px-3 py-2 bg-background border border-panel-border rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="What is this workspace for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter className="pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create Workspace"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
