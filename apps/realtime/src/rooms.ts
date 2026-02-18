import { randomUUID } from "crypto";

export interface RoomMessage {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
}

const roomMessages = new Map<string, RoomMessage[]>();

export function addMessage(roomId: string, sender: string, content: string): RoomMessage {
  const msg: RoomMessage = {
    id: randomUUID(),
    sender,
    content,
    createdAt: new Date().toISOString()
  };

  const existing = roomMessages.get(roomId) ?? [];
  roomMessages.set(roomId, [...existing.slice(-99), msg]);
  return msg;
}

export function getMessages(roomId: string): RoomMessage[] {
  return roomMessages.get(roomId) ?? [];
}
