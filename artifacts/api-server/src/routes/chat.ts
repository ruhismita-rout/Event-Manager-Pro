import { Router, type IRouter } from "express";
import {
  ListChatMessagesParams,
  ListChatMessagesQueryParams,
  ListChatMessagesResponse,
  SendChatMessageParams,
  SendChatMessageBody,
  DeleteChatMessageParams,
} from "@workspace/api-zod";
import {
  deleteChatMessage,
  listChatMessages,
  sendChatMessage,
} from "../lib/store";

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

  const messages = listChatMessages({
    eventId: params.data.eventId,
    limit: query.data.limit,
    before: query.data.before,
  });

  res.json(ListChatMessagesResponse.parse({ messages, total: messages.length }));
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

  const message = sendChatMessage(params.data.eventId, parsed.data);

  res.status(201).json(message);
});

router.delete("/chat/:messageId", async (req, res): Promise<void> => {
  const params = DeleteChatMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const updated = deleteChatMessage(params.data.messageId);

  if (!updated) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
