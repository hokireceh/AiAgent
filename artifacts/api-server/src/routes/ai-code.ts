import { Router, type IRouter } from "express";
import { callGroqWithCascade, type ChatMessage, type MemoryTool } from "../lib/groq-cascade.js";

const router: IRouter = Router();

// No-op memory tool for code assistant (doesn't need memory)
const noopMemoryTools: MemoryTool = {
  saveMemory: async () => ({ id: 0, content: "", category: "" }),
  searchMemories: async () => [],
  deleteMemory: async () => {},
  getAllMemories: async () => [],
};

router.post("/", async (req, res) => {
  const { message, code, language, filename, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: "validation_error", message: "message is required" });
  }

  try {
    let systemContent = `You are an expert coding assistant integrated into a Cloud IDE. Help users write, debug, and improve code.

Guidelines:
- Provide practical, working code solutions
- Explain changes clearly and concisely
- Use markdown code blocks with the correct language tag
- Point out bugs and fix them proactively
- Keep responses focused and useful`;

    if (language) systemContent += `\n\nCurrent language: ${language}`;
    if (filename) systemContent += `\nCurrent file: ${filename}`;
    if (code?.trim()) {
      systemContent += `\n\nCurrent file content:\n\`\`\`${language ?? ""}\n${code}\n\`\`\``;
    }

    const messages: ChatMessage[] = [
      { role: "system", content: systemContent },
    ];

    for (const msg of (history ?? [])) {
      messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }
    messages.push({ role: "user", content: message });

    const result = await callGroqWithCascade(
      messages,
      async () => 0,
      noopMemoryTools,
      []
    );

    res.json({
      content: result.content,
      model: result.model,
      tier: result.tier,
    });
  } catch (err: any) {
    req.log.error({ err }, "AI code route error");
    res.status(500).json({ error: "ai_error", message: err.message ?? "AI service unavailable" });
  }
});

export default router;
