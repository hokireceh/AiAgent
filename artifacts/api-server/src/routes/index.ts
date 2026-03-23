import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import chatRouter from "./chat.js";
import usageRouter from "./usage.js";
import modelsRouter from "./models.js";
import memoriesRouter from "./memories.js";
import workspacesRouter from "./workspaces.js";
import executeRouter from "./execute.js";
import aiCodeRouter from "./ai-code.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/chat", chatRouter);
router.use("/usage", usageRouter);
router.use("/models", modelsRouter);
router.use("/memories", memoriesRouter);
router.use("/workspaces", workspacesRouter);
router.use("/execute", executeRouter);
router.use("/ai/code", aiCodeRouter);

export default router;
