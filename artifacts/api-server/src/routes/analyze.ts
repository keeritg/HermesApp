import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AnalyzeVocalizationBody } from "@workspace/api-zod";

const analyzeRouter = Router();

const MIN_HISTORY_FOR_PREDICTION = 3;

analyzeRouter.post("/analyze", async (req, res) => {
  const parsed = AnalyzeVocalizationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", needsMoreData: false });
    return;
  }

  const { label, confidence, context, history } = parsed.data;

  if (history.length < MIN_HISTORY_FOR_PREDICTION) {
    const remaining = MIN_HISTORY_FOR_PREDICTION - history.length;
    res.status(400).json({
      error: `Not enough data yet. Save ${remaining} more recording${remaining === 1 ? "" : "s"} to unlock AI predictions. More data means more accurate insights.`,
      needsMoreData: true,
    });
    return;
  }

  const historySummary = history
    .slice(-10)
    .map(
      (h, i) =>
        `${i + 1}. Label: "${h.label}" (${(h.confidence * 100).toFixed(0)}% confidence)` +
        (h.context ? `, Context: "${h.context}"` : "") +
        (h.prediction ? `, Prior prediction: "${h.prediction}"` : "")
    )
    .join("\n");

  const userPrompt = [
    `A cat named Leo just made a vocalization. Here is the current observation:`,
    `- Detected sound type: "${label}" (${(confidence * 100).toFixed(0)}% confidence)`,
    context ? `- Context provided by the owner: "${context}"` : `- No additional context provided`,
    ``,
    `Here is Leo's recent vocalization history (most relevant for patterns):`,
    historySummary,
    ``,
    `Based on this pattern data, what is Leo most likely communicating RIGHT NOW?`,
    ``,
    `Instructions:`,
    `- If you have enough evidence to make a confident, specific prediction, give it directly in 1-2 sentences.`,
    `- If the data shows a strong pattern (e.g. always meows at mealtimes), reference it.`,
    `- Do NOT speculate beyond what the data supports. Do NOT invent explanations.`,
    `- If context is missing and the pattern is ambiguous, say so honestly and explain what data would help.`,
    `- Be concise and direct — speak to the owner, not an academic audience.`,
  ].join("\n");

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const block = message.content[0];
    const prediction = block.type === "text" ? block.text.trim() : "";

    res.json({ prediction, confident: true });
  } catch (err) {
    req.log.error({ err }, "Claude API error");
    res.status(500).json({ error: "AI analysis failed. Please try again.", needsMoreData: false });
  }
});

export default analyzeRouter;
