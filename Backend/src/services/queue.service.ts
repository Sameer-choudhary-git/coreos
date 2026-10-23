import { prisma } from "../db/prisma.js";

const QUEUE_NAME = "onboardiq_kyc_processing";

export const queueService = {
  async sendTestMessage() {
    const message = {
      event: "QUEUE_TEST",
      message: "Express connected to Supabase Queues",
      createdAt: new Date().toISOString(),
    };

    const rows = await prisma.$queryRaw<Array<{ send: bigint }>>`
      SELECT *
      FROM pgmq.send(
        ${QUEUE_NAME},
        ${JSON.stringify(message)}::jsonb
      )
    `;

    if (!rows.length) {
      throw new Error("Supabase Queue did not return a message ID");
    }

    return {
      queue: QUEUE_NAME,
      messageId: String(rows[0].send),
      message,
    };
  },
};