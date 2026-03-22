import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, Trash2, Plus, Search, Tag, Loader2 } from "lucide-react";
import { useGetMemories, useDeleteMemory, useCreateMemory } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MemoriesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  personal: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  preference: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  project: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  context: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  skill: "bg-green-500/15 text-green-400 border-green-500/20",
  goal: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  general: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const CATEGORIES = ["personal", "preference", "project", "context", "skill", "goal", "general"];

export function MemoriesPanel({ isOpen, onClose }: MemoriesPanelProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("general");

  const { data, isLoading } = useGetMemories({ query: { enabled: isOpen } });
  const deleteMutation = useDeleteMemory();
  const createMutation = useCreateMemory();

  const memories = data?.memories ?? [];
  const filtered = memories.filter(
    (m) =>
      m.content.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: ["/api/memories"] });
  };

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    await createMutation.mutateAsync({
      data: { content: newContent.trim(), category: newCategory },
    });
    queryClient.invalidateQueries({ queryKey: ["/api/memories"] });
    setNewContent("");
    setNewCategory("general");
    setShowAdd(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Persistent Memory</h2>
                  <p className="text-xs text-muted-foreground">{memories.length} memories stored</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search + Add */}
            <div className="px-4 py-3 border-b border-border shrink-0 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search memories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shrink-0"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Add Memory Form */}
            <AnimatePresence>
              {showAdd && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden shrink-0"
                >
                  <div className="px-4 py-3 bg-secondary/30 border-b border-border space-y-3">
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="What should I remember? (e.g. 'User prefers Python', 'Working on crypto trading bot')"
                      className="w-full bg-card border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2 items-center">
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 flex-1"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleAdd}
                        disabled={!newContent.trim() || createMutation.isPending}
                        className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
                      >
                        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Memory List */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Brain className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {search ? "No memories match your search" : "No memories yet"}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {!search && "AI will automatically save important things as you chat"}
                  </p>
                </div>
              ) : (
                filtered.map((memory) => (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group bg-secondary/40 hover:bg-secondary/70 border border-border/50 rounded-xl p-3.5 flex items-start gap-3 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed">{memory.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border",
                          CATEGORY_COLORS[memory.category] ?? CATEGORY_COLORS.general
                        )}>
                          <Tag className="w-2.5 h-2.5" />
                          {memory.category}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60">
                          {format(new Date(memory.updatedAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(memory.id)}
                      disabled={deleteMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer note */}
            <div className="px-4 py-3 border-t border-border shrink-0">
              <p className="text-xs text-muted-foreground/60 text-center">
                AI automatically saves important context. You can add or delete memories manually.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
