import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, vocalizationLogs } from "@workspace/db";
import { CreateLogBody, GetLogsResponse } from "@workspace/api-zod";

const logsRouter: IRouter = Router();

logsRouter.get("/logs", async (req, res): Promise<void> => {
  req.log.info("Fetching vocalization logs");
  const logs = await db
    .select()
    .from(vocalizationLogs)
    .orderBy(desc(vocalizationLogs.createdAt));
  res.json(GetLogsResponse.parse(logs));
});

logsRouter.post("/logs", async (req, res): Promise<void> => {
  const parsed = CreateLogBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid log request body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { id, label, confidence, context, prediction } = parsed.data;

  const [log] = await db
    .insert(vocalizationLogs)
    .values({
      id,
      label,
      confidence,
      context: context ?? "",
      prediction,
    })
    .returning();

  res.status(201).json(log);
});

logsRouter.delete("/logs", async (req, res): Promise<void> => {
  req.log.info("Clearing all vocalization logs");
  await db.delete(vocalizationLogs);
  res.sendStatus(204);
});

export default logsRouter;
