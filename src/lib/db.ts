import Dexie, { Table } from "dexie";

export type CachedMessage = {
  id: string;
  threadId: string;
  senderId: string;
  body: string | null;
  mediaUrl: string | null;
  kind: "text" | "image" | "voice";
  createdAt: string;
};

export type CachedThread = {
  id: string;
  updatedAt: string;
};

class OurDmDB extends Dexie {
  messages!: Table<CachedMessage, string>;
  threads!: Table<CachedThread, string>;

  constructor() {
    super("ourdm");
    this.version(1).stores({
      messages: "id, threadId, createdAt",
      threads: "id, updatedAt"
    });
  }
}

export const db = new OurDmDB();

export async function cacheMessages(messages: CachedMessage[]) {
  if (!messages.length) return;
  await db.messages.bulkPut(messages);
  const threadUpdates = messages.map((m) => ({
    id: m.threadId,
    updatedAt: m.createdAt
  }));
  await db.threads.bulkPut(threadUpdates);
}

export async function getCachedThreadMessages(threadId: string, limit = 50) {
  return db.messages
    .where("threadId")
    .equals(threadId)
    .reverse()
    .sortBy("createdAt")
    .then((arr) => arr.slice(-limit));
}
