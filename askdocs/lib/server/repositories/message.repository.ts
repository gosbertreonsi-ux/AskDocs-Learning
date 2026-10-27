
import { prisma } from "@/lib/server/prisma";
import type { Message } from "@/lib/types";

export async function findMessages(
  conversationId: string
): Promise<Message[]> {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { id: "asc" },
    select: {
      id: true,
      role: true,
      text: true,
    },
  });
}

export async function saveExchange(
  conversationId: string,
  question: string,
  answer: string
): Promise<Message> {
  return prisma.$transaction(async (tx) => {
    // Create conversation if it does not exist.
    await tx.conversation.upsert({
      where: { id: conversationId },
      update: {},
      create: { id: conversationId },
    });

    // Save the user's question.
    await tx.message.create({
      data: {
        conversationId,
        role: "user",
        text: question,
      },
    });

    // Save the simulated server reply.
    const reply = await tx.message.create({
      data: {
        conversationId,
        role: "ai",
        text: answer,
      },
      select: {
        id: true,
        role: true,
        text: true,
      },
    });

    return reply;
  });
}
