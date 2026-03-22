import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PlusCircle, MessageSquare, Trash2, Send, 
  Settings2, ChevronLeft, Bot, User as UserIcon, Loader2, Brain, Sparkles
} from "lucide-react";
import { 
  useGetConversations, 
  useGetConversation, 
  useCreateConversation, 
  useDeleteConversation, 
  useSendMessage 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ModelBadge } from "@/components/model-badge";
import { UsagePanel } from "@/components/usage-panel";
import { MemoriesPanel } from "@/components/memories-panel";

export function ChatPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const conversationId = params.id ? parseInt(params.id) : null;
  
  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showUsage, setShowUsage] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [tempMessage, setTempMessage] = useState<string | null>(null);
  const [lastMemoriesSaved, setLastMemoriesSaved] = useState<number>(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Queries
  const { data: convsData, isLoading: loadingConvs } = useGetConversations();
  const { data: activeConvData, isLoading: loadingMessages } = useGetConversation(conversationId as number, {
    query: { enabled: !!conversationId }
  });

  // Mutations
  const createMutation = useCreateConversation();
  const deleteMutation = useDeleteConversation();
  const sendMutation = useSendMessage();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConvData?.messages, tempMessage]);

  // Set system prompt when active conversation changes
  useEffect(() => {
    if (activeConvData?.conversation?.systemPrompt) {
      setSystemPrompt(activeConvData.conversation.systemPrompt);
    } else if (!conversationId) {
      setSystemPrompt("");
    }
  }, [activeConvData?.conversation?.systemPrompt, conversationId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const messageText = input.trim();
    setInput("");
    setTempMessage(messageText);

    try {
      let targetId = conversationId;
      
      if (!targetId) {
        // Create new conversation
        const newConv = await createMutation.mutateAsync({
          data: { 
            title: messageText.slice(0, 40) + (messageText.length > 40 ? "..." : ""),
            systemPrompt: systemPrompt || undefined
          }
        });
        targetId = newConv.id;
        
        // Don't navigate yet to avoid race condition with message sending,
        // but we'll update the URL after we send the message successfully.
      }

      // Send the message
      const response = await sendMutation.mutateAsync({
        data: {
          conversationId: targetId,
          message: messageText,
          systemPrompt: systemPrompt || undefined
        }
      });

      // Track memories saved and invalidate memories cache
      const memoriesSavedCount = (response as any).memoriesSaved?.length ?? 0;
      if (memoriesSavedCount > 0) {
        setLastMemoriesSaved(memoriesSavedCount);
        queryClient.invalidateQueries({ queryKey: ["/api/memories"] });
        setTimeout(() => setLastMemoriesSaved(0), 4000);
      }

      // Clear temp message and invalidate cache to fetch real messages
      setTempMessage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      
      if (targetId !== conversationId) {
        setLocation(`/c/${targetId}`);
      } else {
        queryClient.invalidateQueries({ queryKey: [`/api/chat/conversations/${targetId}`] });
      }

      // Refocus input
      setTimeout(() => inputRef.current?.focus(), 100);

    } catch (error) {
      console.error("Failed to send message:", error);
      setTempMessage(null);
      setInput(messageText); // Restore input on failure
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Delete this conversation?")) {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      if (conversationId === id) {
        setLocation("/");
      }
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden text-foreground selection:bg-primary/30">
      
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="h-full border-r border-border bg-sidebar flex flex-col shrink-0 overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h1 className="font-display font-bold text-xl tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                  GroqCascade
                </h1>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors md:hidden"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
              
              <button 
                onClick={() => setLocation("/")}
                className="flex items-center gap-2 w-full bg-primary text-primary-foreground font-medium px-4 py-3 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                <PlusCircle className="w-5 h-5" />
                New Conversation
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
              {loadingConvs ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : convsData?.conversations.length === 0 ? (
                <div className="text-center p-4 text-sm text-muted-foreground">
                  No conversations yet.
                </div>
              ) : (
                convsData?.conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setLocation(`/c/${conv.id}`)}
                    className={cn(
                      "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                      conversationId === conv.id 
                        ? "bg-secondary border-border/50 text-foreground" 
                        : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MessageSquare className={cn("w-4 h-4 shrink-0", conversationId === conv.id ? "text-primary" : "")} />
                      <div className="truncate">
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                        <p className="text-[10px] opacity-70 mt-0.5">{format(new Date(conv.updatedAt), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-border mt-auto space-y-2">
              <button
                onClick={() => setShowMemories(true)}
                className="flex items-center justify-between w-full p-3 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50 transition-all text-sm font-medium text-muted-foreground hover:text-foreground group"
              >
                <span className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Memory
                </span>
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              </button>
              <button
                onClick={() => setShowUsage(true)}
                className="flex items-center justify-between w-full p-3 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50 transition-all text-sm font-medium text-muted-foreground hover:text-foreground group"
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 group-hover:rotate-45 transition-transform duration-500" />
                  Model Cascade
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            )}
            <h2 className="font-semibold truncate max-w-[200px] sm:max-w-md">
              {conversationId && activeConvData ? activeConvData.conversation.title : "New Conversation"}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="text"
              placeholder="System Prompt (Optional)"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="hidden sm:block text-sm bg-secondary border border-border rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground/60"
            />
            <button
              onClick={() => setShowMemories(true)}
              className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              title="Persistent Memory"
            >
              <Brain className="w-5 h-5" />
              {lastMemoriesSaved > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                  {lastMemoriesSaved}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Memory saved notification */}
        <AnimatePresence>
          {lastMemoriesSaved > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-16 right-4 z-20"
            >
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium px-3 py-2 rounded-xl backdrop-blur-sm shadow-lg">
                <Sparkles className="w-3.5 h-3.5" />
                {lastMemoriesSaved === 1 ? "1 memory saved" : `${lastMemoriesSaved} memories saved`}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-6">
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            {!conversationId && !tempMessage ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6 opacity-80">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5">
                  <Bot className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold">How can I help you today?</h2>
                  <p className="text-muted-foreground mt-2 max-w-sm">
                    Powered by an automated cascade of Groq models. We'll always route your request to the best available model.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {loadingMessages && !tempMessage ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                  </div>
                ) : (
                  activeConvData?.messages.map((msg) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-4 max-w-[85%]",
                        msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 shrink-0 rounded-full flex items-center justify-center",
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary border border-border"
                      )}>
                        {msg.role === "user" ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
                      </div>
                      
                      <div className={cn(
                        "flex flex-col gap-2",
                        msg.role === "user" ? "items-end" : "items-start"
                      )}>
                        <div className={cn(
                          "px-5 py-3.5 rounded-2xl shadow-sm",
                          msg.role === "user" 
                            ? "bg-primary text-primary-foreground rounded-tr-sm" 
                            : "bg-card border border-border rounded-tl-sm text-foreground"
                        )}>
                          <MarkdownRenderer content={msg.content} />
                        </div>
                        
                        {msg.role === "assistant" && msg.model && msg.tier && (
                          <div className="px-1">
                            <ModelBadge model={msg.model} tier={msg.tier} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}

                {/* Optimistic Temp Message */}
                {tempMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 max-w-[85%] ml-auto flex-row-reverse"
                  >
                    <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="px-5 py-3.5 rounded-2xl shadow-sm bg-primary text-primary-foreground rounded-tr-sm opacity-70">
                      <MarkdownRenderer content={tempMessage} />
                    </div>
                  </motion.div>
                )}

                {/* Loading State for AI Response */}
                {sendMutation.isPending && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 max-w-[85%] mr-auto"
                  >
                    <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-secondary border border-border">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="px-5 py-4 rounded-2xl bg-card border border-border rounded-tl-sm flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="shrink-0 border-t border-border/50 bg-background px-4 sm:px-6 py-4">
          <div className="max-w-4xl mx-auto relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message the cascade AI..."
              className="w-full bg-card border border-border/80 rounded-2xl pl-5 pr-14 py-4 min-h-[60px] max-h-[200px] resize-none focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-lg shadow-black/5 text-foreground placeholder:text-muted-foreground/60"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sendMutation.isPending}
              className="absolute right-3 bottom-3 p-2.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shadow-md"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 ml-0.5" />
              )}
            </button>
          </div>
          <div className="text-center mt-2 text-xs text-muted-foreground/60 font-medium">
            AI can make mistakes. Consider verifying important information.
          </div>
        </div>
      </div>

      <UsagePanel isOpen={showUsage} onClose={() => setShowUsage(false)} />
      <MemoriesPanel isOpen={showMemories} onClose={() => setShowMemories(false)} />
    </div>
  );
}
