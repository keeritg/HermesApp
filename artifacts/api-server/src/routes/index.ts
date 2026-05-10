import { Router, type IRouter } from "express";
import healthRouter from "./health";
import appRouter from "./routes";
import analyzeRouter from "./analyze";

const router: IRouter = Router();

router.use(healthRouter);
router.use(appRouter);
router.use(analyzeRouter);

export default router;
