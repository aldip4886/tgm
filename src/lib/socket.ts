import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { prisma } from "./db";

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on("connection", (socket: Socket) => {
    socket.on("session:join", async ({ sessionId, participantId, isFacilitator }: { sessionId: string; participantId?: string; isFacilitator?: boolean }) => {
      socket.join(`session:${sessionId}`);

      if (participantId) {
        socket.data.participantId = participantId;
        socket.data.sessionId = sessionId;
        await prisma.sessionParticipant.update({
          where: { id: participantId },
          data: { isConnected: true },
        }).catch(() => {});
      }

      const participants = await prisma.sessionParticipant.findMany({
        where: { sessionId },
        orderBy: { joinedAt: "asc" },
      });

      io?.to(`session:${sessionId}`).emit("session:roster_updated", { participants });
    });

    socket.on("disconnect", async () => {
      const { participantId, sessionId } = socket.data;
      if (participantId && sessionId) {
        await prisma.sessionParticipant.update({
          where: { id: participantId },
          data: { isConnected: false },
        }).catch(() => {});

        const participants = await prisma.sessionParticipant.findMany({
          where: { sessionId },
          orderBy: { joinedAt: "asc" },
        });

        io?.to(`session:${sessionId}`).emit("session:roster_updated", { participants });
      }
    });

    socket.on("presentation:slide_change", ({ sessionId, slideNumber }: { sessionId: string; slideNumber: number }) => {
      io?.to(`session:${sessionId}`).emit("presentation:slide_updated", { slideNumber });
    });

    socket.on("activity:change_state", ({ sessionId, activity }: { sessionId: string; activity: any }) => {
      io?.to(`session:${sessionId}`).emit("activity:state_updated", { activity });
    });

    socket.on("timer:sync", ({ sessionId, activityId, timerStatus, timerEndsAt, timerRemainingMs }: { sessionId: string; activityId: string; timerStatus: string; timerEndsAt?: string | null; timerRemainingMs?: number }) => {
      io?.to(`session:${sessionId}`).emit("timer:updated", { activityId, timerStatus, timerEndsAt, timerRemainingMs });
    });

    socket.on("response:new", ({ sessionId, response }: { sessionId: string; response: any }) => {
      io?.to(`session:${sessionId}`).emit("response:added", { response });
    });

    socket.on("team:split", ({ sessionId, teams }: { sessionId: string; teams: any[] }) => {
      io?.to(`session:${sessionId}`).emit("team:roster_updated", { teams });
    });

    socket.on("team:member_moved", ({ sessionId, participantId, teamId }: { sessionId: string; participantId: string; teamId: string | null }) => {
      io?.to(`session:${sessionId}`).emit("team:member_reassigned", { participantId, teamId });
    });

    socket.on("whiteboard:draw", ({ whiteboardId, elements, appState }: { whiteboardId: string; elements: any; appState: any }) => {
      socket.to(`whiteboard:${whiteboardId}`).emit("whiteboard:scene_updated", { elements, appState });
    });

    socket.on("whiteboard:join", ({ whiteboardId }: { whiteboardId: string }) => {
      socket.join(`whiteboard:${whiteboardId}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO server has not been initialized yet");
  }
  return io;
}
