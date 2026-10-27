
import { prisma } from "@/lib/server/prisma";

export async function saveDocument(data: {
  conversationId: string;
  name: string;
  size: number;
  extractedText: string;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.conversation.upsert({
      where: {
        id: data.conversationId,
      },
      update: {},
      create: {
        id: data.conversationId,
      },
    });

    return tx.document.create({
      data,
      select: {
        id: true,
        name: true,
        size: true,
        createdAt: true,
      },
    });
  });
}

export async function listDocuments(
  conversationId: string
) {
  return prisma.document.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      size: true,
      createdAt: true,
    },
  });
}

export async function findDocument(
  id: string,
  conversationId: string
) {
  return prisma.document.findFirst({
    where: { id, conversationId },
    select: {
      name: true,
      size: true,
      createdAt: true,
      extractedText: true,
    },
  });
}
