import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { prisma } from "./db";

const globalForSocket = globalThis as unknown as {
  io: SocketIOServer | undefined;
};

export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (globalForSocket.io) return globalForSocket.io;

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  globalForSocket.io = io;

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

      io.to(`session:${sessionId}`).emit("session:roster_updated", { participants });
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

        io.to(`session:${sessionId}`).emit("session:roster_updated", { participants });
      }
    });

    socket.on("presentation:slide_change", ({ sessionId, slideNumber }: { sessionId: string; slideNumber: number }) => {
      io.to(`session:${sessionId}`).emit("presentation:slide_updated", { slideNumber });
    });

    socket.on("presentation:linked", ({ sessionId, canvaPresentationUrl, canvaSlideCount }: any) => {
      io.to(`session:${sessionId}`).emit("presentation:linked", { canvaPresentationUrl, canvaSlideCount });
    });

    socket.on("activity:change_state", ({ sessionId, activity }: { sessionId: string; activity: any }) => {
      io.to(`session:${sessionId}`).emit("activity:state_updated", { activity });
    });

    socket.on("timer:sync", ({ sessionId, activityId, timerStatus, timerEndsAt, timerRemainingMs }: { sessionId: string; activityId: string; timerStatus: string; timerEndsAt?: string | null; timerRemainingMs?: number }) => {
      io.to(`session:${sessionId}`).emit("timer:updated", { activityId, timerStatus, timerEndsAt, timerRemainingMs });
    });

    socket.on("response:new", ({ sessionId, response }: { sessionId: string; response: any }) => {
      io.to(`session:${sessionId}`).emit("response:added", { response });
    });

    socket.on("team:split", ({ sessionId, teams }: { sessionId: string; teams: any[] }) => {
      io.to(`session:${sessionId}`).emit("team:roster_updated", { teams });
    });

    socket.on("team:member_moved", ({ sessionId, participantId, teamId }: { sessionId: string; participantId: string; teamId: string | null }) => {
      io.to(`session:${sessionId}`).emit("team:member_reassigned", { participantId, teamId });
    });

    socket.on("whiteboard:draw", ({ whiteboardId, elements, appState }: { whiteboardId: string; elements: any; appState: any }) => {
      socket.to(`whiteboard:${whiteboardId}`).emit("whiteboard:scene_updated", { elements, appState });
    });

    socket.on("whiteboard:join", ({ whiteboardId }: { whiteboardId: string }) => {
      socket.join(`whiteboard:${whiteboardId}`);
    });

    socket.on("whiteboard:leave", ({ whiteboardId }: { whiteboardId: string }) => {
      socket.leave(`whiteboard:${whiteboardId}`);
    });

    socket.on("whiteboard:submitted", ({ sessionId, whiteboardId, teamId, participantId }: any) => {
      io.to(`session:${sessionId}`).emit("whiteboard:submitted", { whiteboardId, teamId, participantId });
    });

    socket.on("whiteboard:project", ({ sessionId, whiteboardId }: { sessionId: string; whiteboardId: string }) => {
      io.to(`session:${sessionId}`).emit("whiteboard:projected", { whiteboardId });
    });

    socket.on("response:project", ({ sessionId, responseId }: { sessionId: string; responseId: string }) => {
      io.to(`session:${sessionId}`).emit("response:projected", { responseId });
    });

    socket.on("leaderboard:visibility_changed", ({ sessionId, visibility }: { sessionId: string; visibility: string }) => {
      io.to(`session:${sessionId}`).emit("leaderboard:visibility_updated", { visibility });
    });

    socket.on("leaderboard:points_awarded", ({ sessionId }: { sessionId: string }) => {
      io.to(`session:${sessionId}`).emit("leaderboard:scores_updated");
    });

    socket.on("badge:award", ({ sessionId, participantId, badge, reason }: any) => {
      io.to(`session:${sessionId}`).emit("badge:celebrate", { participantId, badge, reason });
    });

    socket.on("poll:vote", ({ sessionId, activityId }: { sessionId: string; activityId: string }) => {
      io.to(`session:${sessionId}`).emit("poll:voted", { activityId });
    });

    socket.on("wordcloud:submit", ({ sessionId, activityId }: { sessionId: string; activityId: string }) => {
      io.to(`session:${sessionId}`).emit("wordcloud:updated", { activityId });
    });

    socket.on("qa:new_question", ({ sessionId, activityId, question }: any) => {
      io.to(`session:${sessionId}`).emit("qa:question_added", { activityId, question });
    });

    socket.on("qa:upvote", ({ sessionId, activityId, questionId }: any) => {
      io.to(`session:${sessionId}`).emit("qa:question_upvoted", { activityId, questionId });
    });

    socket.on("qa:status_change", ({ sessionId, activityId, questionId, status }: any) => {
      io.to(`session:${sessionId}`).emit("qa:question_status", { activityId, questionId, status });
    });

    socket.on("ranking:submit", ({ sessionId, activityId }: { sessionId: string; activityId: string }) => {
      io.to(`session:${sessionId}`).emit("ranking:updated", { activityId });
    });

    socket.on("point:award", ({ sessionId, notificationId, recipientId, amount, reason, giverName }: any) => {
      io.to(`session:${sessionId}`).emit("point:awarded_notification", {
        notificationId,
        recipientId,
        amount,
        reason,
        giverName,
      });
      io.to(`session:${sessionId}`).emit("leaderboard:scores_updated");
    });

    socket.on("comment:add", ({ sessionId, notificationId, recipientId, commenterName, content, reason, responseId }: any) => {
      io.to(`session:${sessionId}`).emit("comment:received_notification", {
        notificationId,
        recipientId,
        commenterName,
        content,
        reason: reason || content,
        responseId,
      });
    });

    socket.on("like:add", ({ sessionId, notificationId, recipientId, giverName, reason, responseId }: any) => {
      io.to(`session:${sessionId}`).emit("like:received_notification", {
        notificationId,
        recipientId,
        giverName,
        reason,
        responseId,
      });
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!globalForSocket.io) {
    throw new Error("Socket.IO server has not been initialized yet");
  }
  return globalForSocket.io;
}
