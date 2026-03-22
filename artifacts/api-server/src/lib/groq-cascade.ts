export interface ModelTier {
  id: string;
  name: string;
  tier: number;
  dailyLimit: number;
  rpmLimit: number;
}

export const MODEL_TIERS: ModelTier[] = [
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile",
    tier: 1,
    dailyLimit: 1000,
    rpmLimit: 30,
  },
  {
    id: "moonshotai/kimi-k2-instruct",
    name: "Kimi K2 Instruct",
    tier: 2,
    dailyLimit: 1000,
    rpmLimit: 60,
  },
  {
    id: "compound-beta",
    name: "Groq Compound Beta",
    tier: 3,
    dailyLimit: 250,
    rpmLimit: 20,
  },
  {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout 17B",
    tier: 4,
    dailyLimit: 1000,
    rpmLimit: 30,
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    tier: 5,
    dailyLimit: 14400,
    rpmLimit: 30,
  },
];

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  name?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface MemoryTool {
  saveMemory: (content: string, category: string) => Promise<{ id: number; content: string; category: string }>;
  searchMemories: (query: string) => Promise<Array<{ id: number; content: string; category: string }>>;
  deleteMemory: (id: number) => Promise<void>;
  getAllMemories: () => Promise<Array<{ id: number; content: string; category: string }>>;
}

export interface GroqResponse {
  content: string;
  model: string;
  tier: number;
  tokensUsed: number;
  memoriesUsed?: Array<{ id: number; content: string; category: string }>;
  memoriesSaved?: Array<{ content: string; category: string }>;
}

const MEMORY_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "save_memory",
      description: "Save important information about the user, their preferences, goals, or context that should be remembered in future conversations. Use this proactively when you learn something meaningful about the user.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The information to remember. Be specific and concise. Example: 'User prefers Python for scripting', 'User is building a trading bot for crypto', 'User's name is Budi'",
          },
          category: {
            type: "string",
            enum: ["personal", "preference", "project", "context", "skill", "goal", "general"],
            description: "Category for the memory to make retrieval easier",
          },
        },
        required: ["content", "category"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_memories",
      description: "Search existing memories to retrieve relevant context about the user. Use this at the start of conversations or when needing to recall something specific.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query to find relevant memories",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_memory",
      description: "Delete a specific memory by ID when the user asks you to forget something or when information is outdated.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "The ID of the memory to delete",
          },
        },
        required: ["id"],
      },
    },
  },
];

async function executeToolCall(
  toolCall: ToolCall,
  memoryTools: MemoryTool,
  memoriesSaved: Array<{ content: string; category: string }>
): Promise<string> {
  const args = JSON.parse(toolCall.function.arguments);

  switch (toolCall.function.name) {
    case "save_memory": {
      const saved = await memoryTools.saveMemory(args.content, args.category);
      memoriesSaved.push({ content: args.content, category: args.category });
      return JSON.stringify({ success: true, id: saved.id, message: `Remembered: "${args.content}"` });
    }

    case "search_memories": {
      const results = await memoryTools.searchMemories(args.query);
      if (results.length === 0) {
        return JSON.stringify({ memories: [], message: "No memories found matching your query" });
      }
      return JSON.stringify({ memories: results });
    }

    case "delete_memory": {
      await memoryTools.deleteMemory(args.id);
      return JSON.stringify({ success: true, message: `Memory ${args.id} deleted` });
    }

    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

export async function callGroqWithCascade(
  messages: ChatMessage[],
  usageGetter: (modelId: string) => Promise<number>,
  memoryTools: MemoryTool,
  existingMemories: Array<{ id: number; content: string; category: string }>
): Promise<GroqResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const memoriesSaved: Array<{ content: string; category: string }> = [];

  // Inject memories into system prompt
  const messagesWithMemory: ChatMessage[] = [...messages];
  if (existingMemories.length > 0 && messagesWithMemory[0]?.role === "system") {
    const memoriesText = existingMemories
      .map((m) => `[${m.category}] ${m.content}`)
      .join("\n");
    messagesWithMemory[0] = {
      ...messagesWithMemory[0],
      content: `${messagesWithMemory[0].content}\n\n## What you remember about this user:\n${memoriesText}\n\nUse this context naturally. Save new memories proactively using save_memory tool.`,
    };
  } else if (existingMemories.length > 0) {
    const memoriesText = existingMemories
      .map((m) => `[${m.category}] ${m.content}`)
      .join("\n");
    messagesWithMemory.unshift({
      role: "system",
      content: `You are a helpful AI assistant with persistent memory.\n\n## What you remember about this user:\n${memoriesText}\n\nUse this context naturally. Save new memories proactively using save_memory tool.`,
    });
  }

  for (const model of MODEL_TIERS) {
    const usedToday = await usageGetter(model.id);
    if (usedToday >= model.dailyLimit) {
      continue;
    }

    try {
      let currentMessages = [...messagesWithMemory];
      let finalContent = "";
      let totalTokens = 0;
      let iterations = 0;
      const maxIterations = 5;

      while (iterations < maxIterations) {
        iterations++;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model.id,
            messages: currentMessages,
            max_tokens: 4096,
            temperature: 0.7,
            tools: MEMORY_TOOLS,
            tool_choice: "auto",
          }),
        });

        if (response.status === 429) {
          break;
        }

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Groq API error ${response.status}: ${err}`);
        }

        const data = await response.json() as {
          choices: Array<{
            message: {
              content: string | null;
              tool_calls?: ToolCall[];
            };
            finish_reason: string;
          }>;
          usage: { total_tokens: number };
          model: string;
        };

        totalTokens += data.usage?.total_tokens ?? 0;
        const choice = data.choices[0]!;

        // If no tool calls, we're done
        if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
          finalContent = choice.message.content ?? "";
          break;
        }

        // Execute tool calls
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: choice.message.content,
          tool_calls: choice.message.tool_calls,
        };
        currentMessages.push(assistantMessage);

        for (const toolCall of choice.message.tool_calls) {
          const result = await executeToolCall(toolCall, memoryTools, memoriesSaved);
          currentMessages.push({
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
          });
        }
      }

      if (!finalContent && iterations >= maxIterations) {
        finalContent = "I've processed your request and updated my memory as needed.";
      }

      if (finalContent) {
        return {
          content: finalContent,
          model: model.id,
          tier: model.tier,
          tokensUsed: totalTokens,
          memoriesUsed: existingMemories,
          memoriesSaved,
        };
      }
    } catch (err: unknown) {
      if (err instanceof Error && (err.message.includes("429") || err.message.includes("rate limit"))) {
        continue;
      }
      throw err;
    }
  }

  throw new Error("All models are rate limited or daily limits exceeded");
}
