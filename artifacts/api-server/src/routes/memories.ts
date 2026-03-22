import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { memoriesTable, insertMemorySchema } from "@workspace/db/schema";
import { eq, desc, like, or } from "drizzle-orm";
import { z } from "zod/v4";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const memories = await db
      .select()
      .from(memoriesTable)
      .orderBy(desc(memoriesTable.updatedAt));
    res.json({ memories });
  } catch (err) {
    req.log.error({ err }, "Failed to get memories");
    res.status(500).json({ error: "server_error", message: "Failed to fetch memories" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = insertMemorySchema.parse(req.body);
    const [created] = await db.insert(memoriesTable).values(body).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Failed to create memory");
    res.status(400).json({ error: "validation_error", message: "Invalid request body" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id!, 10);
    await db.delete(memoriesTable).where(eq(memoriesTable.id, id));
    res.json({ success: true, message: "Memory deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete memory" );
    res.status(500).json({ error: "server_error", message: "Failed to delete memory" });
  }
});

router.get("/search", async (req, res) => {
  try {
    const query = (req.query.q as string) ?? "";
    if (!query) {
      const all = await db.select().from(memoriesTable).orderBy(desc(memoriesTable.updatedAt));
      res.json({ memories: all });
      return;
    }

    const memories = await db
      .select()
      .from(memoriesTable)
      .where(
        or(
          like(memoriesTable.content, `%${query}%`),
          like(memoriesTable.category, `%${query}%`)
        )
      )
      .orderBy(desc(memoriesTable.updatedAt));

    res.json({ memories });
  } catch (err) {
    req.log.error({ err }, "Failed to search memories");
    res.status(500).json({ error: "server_error", message: "Failed to search memories" });
  }
});

export default router;
