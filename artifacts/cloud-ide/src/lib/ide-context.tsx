import React, { createContext, useContext, useState, ReactNode } from "react";
import type { FileItem } from "@workspace/api-client-react";

export type OutputMessage = {
  id: string;
  type: "system" | "stdout" | "stderr";
  text: string;
};

export type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

interface IdeState {
  activeWorkspaceId: number | null;
  setActiveWorkspaceId: (id: number | null) => void;
  
  activeFileId: number | null;
  setActiveFileId: (id: number | null) => void;
  
  openFiles: FileItem[];
  openFile: (file: FileItem) => void;
  closeFile: (fileId: number) => void;
  
  leftPanel: "files" | "ai" | null;
  setLeftPanel: (panel: "files" | "ai" | null) => void;
  
  outputVisible: boolean;
  setOutputVisible: (visible: boolean) => void;
  
  outputMessages: OutputMessage[];
  addOutput: (type: OutputMessage["type"], text: string) => void;
  clearOutput: () => void;

  aiHistory: AiMessage[];
  addAiMessage: (msg: AiMessage) => void;
  clearAiHistory: () => void;
}

const IdeContext = createContext<IdeState | undefined>(undefined);

export function IdeProvider({ children }: { children: ReactNode }) {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [openFiles, setOpenFiles] = useState<FileItem[]>([]);
  const [leftPanel, setLeftPanel] = useState<"files" | "ai" | null>("files");
  const [outputVisible, setOutputVisible] = useState(false);
  const [outputMessages, setOutputMessages] = useState<OutputMessage[]>([]);
  const [aiHistory, setAiHistory] = useState<AiMessage[]>([]);

  const openFile = (file: FileItem) => {
    setOpenFiles((prev) => {
      if (!prev.find((f) => f.id === file.id)) {
        return [...prev, file];
      }
      return prev;
    });
    setActiveFileId(file.id);
  };

  const closeFile = (fileId: number) => {
    setOpenFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== fileId);
      if (activeFileId === fileId) {
        setActiveFileId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
      }
      return filtered;
    });
  };

  const addOutput = (type: OutputMessage["type"], text: string) => {
    setOutputVisible(true);
    setOutputMessages((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(7), type, text },
    ]);
  };

  const clearOutput = () => setOutputMessages([]);

  const addAiMessage = (msg: AiMessage) => {
    setAiHistory((prev) => [...prev, msg]);
  };

  const clearAiHistory = () => setAiHistory([]);

  return (
    <IdeContext.Provider
      value={{
        activeWorkspaceId,
        setActiveWorkspaceId,
        activeFileId,
        setActiveFileId,
        openFiles,
        openFile,
        closeFile,
        leftPanel,
        setLeftPanel,
        outputVisible,
        setOutputVisible,
        outputMessages,
        addOutput,
        clearOutput,
        aiHistory,
        addAiMessage,
        clearAiHistory,
      }}
    >
      {children}
    </IdeContext.Provider>
  );
}

export function useIde() {
  const context = useContext(IdeContext);
  if (!context) throw new Error("useIde must be used within an IdeProvider");
  return context;
}
