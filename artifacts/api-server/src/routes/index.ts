import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import chatRouter from "./chat.js";
import usageRouter from "./usage.js";
import modelsRouter from "./models.js";
import memoriesRouter from "./memories.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/chat", chatRouter);
router.use("/usage", usageRouter);
router.use("/models", modelsRouter);
router.use("/memories", memoriesRouter);

export default router;
