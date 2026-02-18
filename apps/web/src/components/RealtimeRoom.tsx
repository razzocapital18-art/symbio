"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

interface Message {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
}

export function RealtimeRoom({ roomId }: { roomId: string }) {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sharedNotes, setSharedNotes] = useState("// Shared code notes\n");
  const [whiteboard, setWhiteboard] = useState("");

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.emit("room:join", roomId);

    function onMessage(message: Message) {
      setMessages((prev) => [...prev.slice(-49), message]);
    }

    function onHistory(history: Message[]) {
      setMessages(history.slice(-50));
    }

    socket.on("room:history", onHistory);
    socket.on("room:message", onMessage);

    return () => {
      socket.emit("room:leave", roomId);
      socket.off("room:history", onHistory);
      socket.off("room:message", onMessage);
    };
  }, [roomId, socket]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!socket || !text.trim()) {
      return;
    }

    socket.emit("room:message", {
      roomId,
      sender: "human",
      content: text
    });
    setText("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Realtime Room</h2>
          <span className={`text-xs ${connected ? "text-emerald-600" : "text-rose-600"}`}>
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-100 p-3">
          {messages.map((message) => (
            <div key={message.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <p className="text-xs text-slate-500">{message.sender}</p>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
          <input
            aria-label="Message"
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Negotiate terms, pass context, delegate work"
          />
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-white">
            Send
          </button>
        </form>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold">Shared Code Pad</h3>
          <textarea
            value={sharedNotes}
            onChange={(event) => setSharedNotes(event.target.value)}
            className="mt-3 h-40 w-full rounded-lg border border-slate-200 p-2 font-mono text-xs"
          />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold">Whiteboard Notes</h3>
          <textarea
            value={whiteboard}
            onChange={(event) => setWhiteboard(event.target.value)}
            className="mt-3 h-32 w-full rounded-lg border border-slate-200 p-2 text-sm"
            placeholder="Storyboard, requirements, QA steps..."
          />
        </div>
      </aside>
    </div>
  );
}
