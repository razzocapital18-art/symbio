"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Message {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
}

export function RealtimeRoom({ roomId }: { roomId: string }) {
  const { socket, connected } = useSocket();
  const { context } = useCurrentUser();
  const senderLabel = useMemo(() => {
    if (!context?.user) {
      return "guest";
    }
    return `${context.user.name} (${context.user.role === "AGENT_BUILDER" ? "builder" : "human"})`;
  }, [context?.user]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sharedNotes, setSharedNotes] = useState("// Shared code notes\n");
  const [whiteboard, setWhiteboard] = useState("");
  const [roomTokenStatus, setRoomTokenStatus] = useState("Checking room access...");

  useEffect(() => {
    async function checkRoomToken() {
      const response = await fetch(`/api/rooms/token?roomId=${encodeURIComponent(roomId)}`);
      const body = await response.json();
      if (!response.ok) {
        setRoomTokenStatus(body.error || "Unable to get room token.");
        return;
      }
      setRoomTokenStatus("Room token issued. Collaboration channel is authorized.");
    }

    void checkRoomToken();
  }, [roomId]);

  useEffect(() => {
    const notesKey = `symbio-room-notes:${roomId}`;
    const whiteboardKey = `symbio-room-whiteboard:${roomId}`;
    const savedNotes = window.localStorage.getItem(notesKey);
    const savedWhiteboard = window.localStorage.getItem(whiteboardKey);
    if (savedNotes) {
      setSharedNotes(savedNotes);
    }
    if (savedWhiteboard) {
      setWhiteboard(savedWhiteboard);
    }
  }, [roomId]);

  useEffect(() => {
    const notesKey = `symbio-room-notes:${roomId}`;
    window.localStorage.setItem(notesKey, sharedNotes);
  }, [roomId, sharedNotes]);

  useEffect(() => {
    const whiteboardKey = `symbio-room-whiteboard:${roomId}`;
    window.localStorage.setItem(whiteboardKey, whiteboard);
  }, [roomId, whiteboard]);

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
      sender: senderLabel,
      content: text
    });
    setText("");
  }

  function broadcastTemplate(kind: "milestone" | "handoff" | "dispute") {
    const templates = {
      milestone: "Milestone update: deliverables uploaded, awaiting verification and release.",
      handoff: "Handoff request: passing scope + context to next operator in execution chain.",
      dispute: "Dispute alert: quality mismatch detected, escalating to moderation."
    };
    setText(templates[kind]);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Realtime Room</h2>
            <p className="text-xs text-slate-500">{roomTokenStatus}</p>
          </div>
          <span className={`text-xs ${connected ? "text-emerald-600" : "text-rose-600"}`}>
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-100 p-3">
          {messages.map((message) => (
            <div key={message.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">{message.sender}</p>
                <p className="text-xs text-slate-400">{new Date(message.createdAt).toLocaleTimeString()}</p>
              </div>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => broadcastTemplate("milestone")} className="rounded-lg border border-slate-300 px-3 py-1 text-xs">
            Milestone update
          </button>
          <button onClick={() => broadcastTemplate("handoff")} className="rounded-lg border border-slate-300 px-3 py-1 text-xs">
            Swarm handoff
          </button>
          <button onClick={() => broadcastTemplate("dispute")} className="rounded-lg border border-slate-300 px-3 py-1 text-xs">
            Dispute alert
          </button>
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
