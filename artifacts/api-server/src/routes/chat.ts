import { Router, type IRouter } from "express";
import { eq, desc, count, sql, or, like } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  conversationsTable,
  messagesTable,
  modelUsageTable,
  memoriesTable,
  insertConversationSchema,
} from "@workspace/db/schema";
import { callGroqWithCascade, MODEL_TIERS } from "../lib/groq-cascade.js";
import type { MemoryTool } from "../lib/groq-cascade.js";
import { z } from "zod/v4";

const router: IRouter = Router();

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]!;
}

async function getModelUsageToday(modelId: string): Promise<number> {
  const today = getTodayDate();
  const rows = await db
    .select()
    .from(modelUsageTable)
    .where(sql`${modelUsageTable.modelId} = ${modelId} AND ${modelUsageTable.date} = ${today}`);
  return rows[0]?.requestCount ?? 0;
}

async function incrementModelUsage(modelId: string): Promise<void> {
  const today = getTodayDate();
  const existing = await db
    .select()
    .from(modelUsageTable)
    .where(sql`${modelUsageTable.modelId} = ${modelId} AND ${modelUsageTable.date} = ${today}`);

  if (existing.length > 0) {
    await db
      .update(modelUsageTable)
      .set({ requestCount: (existing[0]!.requestCount ?? 0) + 1 })
      .where(sql`${modelUsageTable.modelId} = ${modelId} AND ${modelUsageTable.date} = ${today}`);
  } else {
    await db.insert(modelUsageTable).values({ modelId, date: today, requestCount: 1 });
  }
}

function createMemoryTools(): MemoryTool {
  return {
    saveMemory: async (content: string, category: string) => {
      const [saved] = await db
        .insert(memoriesTable)
        .values({ content, category })
        .returning();
      return { id: saved!.id, content: saved!.content, category: saved!.category };
    },
    searchMemories: async (query: string) => {
      const results = await db
        .select()
        .from(memoriesTable)
        .where(
          or(
            like(memoriesTable.content, `%${query}%`),
            like(memoriesTable.category, `%${query}%`)
          )
        )
        .orderBy(desc(memoriesTable.updatedAt))
        .limit(10);
      return results.map((r) => ({ id: r.id, content: r.content, category: r.category }));
    },
    deleteMemory: async (id: number) => {
      await db.delete(memoriesTable).where(eq(memoriesTable.id, id));
    },
    getAllMemories: async () => {
      const all = await db
        .select()
        .from(memoriesTable)
        .orderBy(desc(memoriesTable.updatedAt));
      return all.map((m) => ({ id: m.id, content: m.content, category: m.category }));
    },
  };
}

router.get("/conversations", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: conversationsTable.id,
        title: conversationsTable.title,
        systemPrompt: conversationsTable.systemPrompt,
        createdAt: conversationsTable.createdAt,
        updatedAt: conversationsTable.updatedAt,
      })
      .from(conversationsTable)
      .orderBy(desc(conversationsTable.updatedAt));

    const withCounts = await Promise.all(
      rows.map(async (conv) => {
        const [{ value }] = await db
          .select({ value: count() })
          .from(messagesTable)
          .where(eq(messagesTable.conversationId, conv.id));
        return { ...conv, messageCount: value ?? 0 };
      })
    );

    res.json({ conversations: withCounts });
  } catch (err) {
    req.log.error({ err }, "Failed to get conversations");
    res.status(500).json({ error: "server_error", message: "Failed to fetch conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const body = insertConversationSchema.parse(req.body);
    const [created] = await db.insert(conversationsTable).values(body).returning();
    res.status(201).json({ ...created, messageCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(400).json({ error: "validation_error", message: "Invalid request body" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!, 10);
    const [conv] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));

    if (!conv) {
      res.status(404).json({ error: "not_found", message: "Conversation not found" });
      return;
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);

    const [{ value: messageCount }] = await db
      .select({ value: count() })
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id));

    res.json({
      conversation: { ...conv, messageCount: messageCount ?? 0 },
      messages,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get conversation");
    res.status(500).json({ error: "server_error", message: "Failed to fetch conversation" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!, 10);
    await db.delete(conversationsTable).where(eq(conversationsTable.id, id));
    res.json({ success: true, message: "Conversation deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "server_error", message: "Failed to delete conversation" });
  }
});

const sendMessageSchema = z.object({
  conversationId: z.number().int().optional().nullable(),
  message: z.string().min(1),
  systemPrompt: z.string().optional().nullable(),
});

router.post("/", async (req, res) => {
  try {
    const body = sendMessageSchema.parse(req.body);
    let conversationId = body.conversationId;

    if (!conversationId) {
      const title = body.message.slice(0, 60) + (body.message.length > 60 ? "..." : "");
      const [conv] = await db
        .insert(conversationsTable)
        .values({ title, systemPrompt: body.systemPrompt ?? null })
        .returning();
      conversationId = conv!.id;
    }

    await db.insert(messagesTable).values({
      conversationId,
      role: "user",
      content: body.message,
    });

    const history = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(messagesTable.createdAt);

    const [conv] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversationId));

    const memoryTools = createMemoryTools();
    const allMemories = await memoryTools.getAllMemories();

    const groqMessages: Array<{ role: "user" | "assistant" | "system" | "tool"; content: string | null; tool_call_id?: string; name?: string }> = [];

    const systemPrompt = body.systemPrompt ?? conv?.systemPrompt;
    const baseSystemPrompt = systemPrompt
      ? systemPrompt
      : "You are a helpful AI assistant with persistent memory. Remember important things about the user proactively using save_memory.";

    groqMessages.push({ role: "system", content: baseSystemPrompt });

    for (const msg of history) {
      groqMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }

    const result = await callGroqWithCascade(
      groqMessages,
      getModelUsageToday,
      memoryTools,
      allMemories
    );

    await incrementModelUsage(result.model);

    const [savedMsg] = await db
      .insert(messagesTable)
      .values({
        conversationId,
        role: "assistant",
        content: result.content,
        model: result.model,
        tier: result.tier,
        tokensUsed: result.tokensUsed,
      })
      .returning();

    await db
      .update(conversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(conversationsTable.id, conversationId));

    res.json({
      conversationId,
      messageId: savedMsg!.id,
      content: result.content,
      model: result.model,
      tier: result.tier,
      tokensUsed: result.tokensUsed,
      memoriesSaved: result.memoriesSaved ?? [],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    if (err instanceof Error && err.message.includes("rate limit")) {
      res.status(429).json({ error: "rate_limited", message: err.message });
      return;
    }
    res.status(500).json({ error: "server_error", message: "Failed to process message" });
  }
});

export default router;
