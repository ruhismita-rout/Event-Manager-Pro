import { Router, type IRouter } from "express";
import { eq, and, desc, lt } from "drizzle-orm";
import { db, chatMessagesTable } from "@workspace/db";
import {
  ListChatMessagesParams,
  ListChatMessagesQueryParams,
  ListChatMessagesResponse,
  SendChatMessageParams,
  SendChatMessageBody,
  DeleteChatMessageParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events/:eventId/chat", async (req, res): Promise<void> => {
  const params = ListChatMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = ListChatMessagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { limit, before } = query.data;

  const conditions = [
    eq(chatMessagesTable.eventId, params.data.eventId),
    eq(chatMessagesTable.isDeleted, false),
  ];

  if (before) {
    conditions.push(lt(chatMessagesTable.id, before));
  }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(and(...conditions))
    .orderBy(desc(chatMessagesTable.sentAt))
    .limit(limit);

  res.json(ListChatMessagesResponse.parse({ messages: messages.reverse(), total: messages.length }));
});

router.post("/events/:eventId/chat", async (req, res): Promise<void> => {
  const params = SendChatMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [message] = await db.insert(chatMessagesTable).values({
    eventId: params.data.eventId,
    senderName: parsed.data.senderName,
    message: parsed.data.message,
    isPinned: false,
    isDeleted: false,
  }).returning();

  res.status(201).json(message);
});

router.delete("/chat/:messageId", async (req, res): Promise<void> => {
  const params = DeleteChatMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [updated] = await db
    .update(chatMessagesTable)
    .set({ isDeleted: true })
    .where(eq(chatMessagesTable.id, params.data.messageId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
