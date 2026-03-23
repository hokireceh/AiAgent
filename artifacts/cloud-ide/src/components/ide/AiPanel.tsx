import { useState, useRef, useEffect } from "react";
import { Bot, User, Send, Loader2, Code } from "lucide-react";
import { useIde } from "@/lib/ide-context";
import { useAiCodeAssist } from "@workspace/api-client-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export function AiPanel() {
  const { aiHistory, addAiMessage, openFiles, activeFileId } = useIde();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const aiMutation = useAiCodeAssist();
  const activeFile = openFiles.find(f => f.id === activeFileId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiHistory, aiMutation.isPending]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput("");
    
    addAiMessage({ role: "user", content: msg });

    try {
      const res = await aiMutation.mutateAsync({
        data: {
          message: msg,
          code: activeFile?.content,
          filename: activeFile?.name,
          language: activeFile?.language,
          history: aiHistory.map(h => ({ role: h.role, content: h.content }))
        }
      });

      addAiMessage({ role: "assistant", content: res.content });
    } catch (err) {
      addAiMessage({ role: "assistant", content: "**Error:** Failed to connect to AI assistant." });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-r border-panel-border overflow-hidden">
      <div className="h-10 flex items-center justify-between px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0 border-b border-panel-border">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span>AI Assistant</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {aiHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground opacity-60">
            <Bot className="w-12 h-12 mb-4 text-primary" />
            <p className="text-sm">I'm your AI coding assistant.</p>
            <p className="text-xs mt-2 max-w-[200px]">I can help you write, debug, and understand code in your workspace.</p>
          </div>
        ) : (
          aiHistory.map((msg, idx) => (
            <div key={idx} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                msg.role === 'user' ? "bg-primary/20 border-primary/30 text-primary" : "bg-panel border-panel-border text-foreground"
              )}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <div className={cn(
                "max-w-[85%] rounded-xl p-3 text-sm",
                msg.role === 'user' 
                  ? "bg-primary/10 text-foreground border border-primary/20" 
                  : "bg-panel border border-panel-border text-foreground prose prose-invert prose-p:leading-relaxed prose-pre:bg-background prose-pre:border prose-pre:border-panel-border prose-pre:p-3"
              )}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))
        )}
        
        {aiMutation.isPending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-panel border border-panel-border flex items-center justify-center shrink-0 text-primary">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-panel border border-panel-border rounded-xl p-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-100" />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-200" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-panel-border bg-panel/30">
        {activeFile && (
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <Code className="w-3 h-3" />
            Context: {activeFile.name}
          </div>
        )}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask AI anything..."
            className="w-full bg-background border border-panel-border rounded-xl pl-3 pr-10 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none max-h-32 min-h-[44px]"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || aiMutation.isPending}
            className="absolute right-2 bottom-2 p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {aiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
