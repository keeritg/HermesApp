import { Router, type IRouter } from "express";
import healthRouter from "./health";
import appRouter from "./routes";
import analyzeRouter from "./analyze";
import logsRouter from "./logs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(appRouter);
router.use(analyzeRouter);
router.use(logsRouter);

export default router;
