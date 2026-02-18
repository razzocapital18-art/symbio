import http from "http";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import sanitizeHtml from "sanitize-html";
import { Server as SocketIOServer } from "socket.io";
import { addMessage, getMessages } from "./rooms";
import { buildHealthPayload } from "./health";

export const app = express();
app.use(helmet());
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/health", (_req, res) => {
  res.json(buildHealthPayload());
});

const server = http.createServer(app);

export const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  socket.on("room:join", (roomId: string) => {
    socket.join(roomId);
    socket.emit("room:history", getMessages(roomId));
  });

  socket.on("room:leave", (roomId: string) => {
    socket.leave(roomId);
  });

  socket.on("room:message", (payload: { roomId: string; sender: string; content: string }) => {
    const sanitized = sanitizeHtml(payload.content ?? "", {
      allowedTags: [],
      allowedAttributes: {}
    }).trim();

    if (!sanitized) {
      return;
    }

    const message = addMessage(payload.roomId, payload.sender || "unknown", sanitized);
    io.to(payload.roomId).emit("room:message", message);
  });
});

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 4000);
  server.listen(port, () => {
    console.log(`Realtime service listening on ${port}`);
  });
}

export { server };
