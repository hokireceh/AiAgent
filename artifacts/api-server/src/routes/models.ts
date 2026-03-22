import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { modelUsageTable } from "@workspace/db/schema";
import { MODEL_TIERS } from "../lib/groq-cascade.js";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0]!;

    const rows = await db
      .select()
      .from(modelUsageTable)
      .where(sql`${modelUsageTable.date} = ${today}`);

    const usageMap = new Map<string, number>();
    for (const row of rows) {
      usageMap.set(row.modelId, row.requestCount);
    }

    const models = MODEL_TIERS.map((model) => {
      const usedToday = usageMap.get(model.id) ?? 0;
      return {
        id: model.id,
        name: model.name,
        tier: model.tier,
        dailyLimit: model.dailyLimit,
        usedToday,
        available: usedToday < model.dailyLimit,
      };
    });

    res.json({ models });
  } catch (err) {
    req.log.error({ err }, "Failed to get models");
    res.status(500).json({ error: "server_error", message: "Failed to fetch models" });
  }
});

export default router;
