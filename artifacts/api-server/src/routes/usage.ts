import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { modelUsageTable } from "@workspace/db/schema";
import { MODEL_TIERS } from "../lib/groq-cascade.js";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]!;
}

router.get("/", async (req, res) => {
  try {
    const today = getTodayDate();

    const rows = await db
      .select()
      .from(modelUsageTable)
      .where(sql`${modelUsageTable.date} = ${today}`);

    const usageMap = new Map<string, number>();
    for (const row of rows) {
      usageMap.set(row.modelId, row.requestCount);
    }

    const usage = MODEL_TIERS.map((model) => {
      const requestsToday = usageMap.get(model.id) ?? 0;
      return {
        modelId: model.id,
        modelName: model.name,
        tier: model.tier,
        requestsToday,
        dailyLimit: model.dailyLimit,
        remainingToday: Math.max(0, model.dailyLimit - requestsToday),
        date: today,
      };
    });

    const totalRequestsToday = usage.reduce((sum, u) => sum + u.requestsToday, 0);
    const totalRemainingToday = usage.reduce((sum, u) => sum + u.remainingToday, 0);

    res.json({ usage, totalRequestsToday, totalRemainingToday });
  } catch (err) {
    req.log.error({ err }, "Failed to get usage");
    res.status(500).json({ error: "server_error", message: "Failed to fetch usage" });
  }
});

export default router;
