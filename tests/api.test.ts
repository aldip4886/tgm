import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { POST as createSessionRoute } from "../src/app/api/sessions/route";
import { POST as joinSessionRoute } from "../src/app/api/sessions/join/route";
import { POST as reconnectRoute } from "../src/app/api/sessions/reconnect/route";
import { GET as getSessionRoute } from "../src/app/api/sessions/[id]/route";
import { NextRequest } from "next/server";

describe("HTTP API Seam Tests - Ticket 01", () => {
  beforeEach(async () => {
    await prisma.event.deleteMany();
    await prisma.sessionParticipant.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it("POST /api/sessions creates a session and returns 201 with code & QR", async () => {
    const req = new NextRequest("http://localhost:3000/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        title: "Product Strategy Summit",
        facilitatorName: "Michael Scott",
        facilitatorEmail: "michael@dundermifflin.com",
      }),
    });

    const res = await createSessionRoute(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.code).toHaveLength(6);
    expect(data.qrCode).toContain("data:image/png;base64,");
  });

  it("POST /api/sessions/join lets a participant join and returns recovery token", async () => {
    // 1. Create session
    const createReq = new NextRequest("http://localhost:3000/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        title: "Sales Pitch Training",
        facilitatorName: "Jim Halpert",
        facilitatorEmail: "jim@dundermifflin.com",
      }),
    });
    const sessionRes = await createSessionRoute(createReq);
    const session = await sessionRes.json();

    // 2. Join session
    const joinReq = new NextRequest("http://localhost:3000/api/sessions/join", {
      method: "POST",
      body: JSON.stringify({
        code: session.code,
        displayName: "Dwight Schrute",
      }),
    });
    const joinRes = await joinSessionRoute(joinReq);
    expect(joinRes.status).toBe(200);
    const joinData = await joinRes.json();
    expect(joinData.participant.displayName).toBe("Dwight Schrute");
    expect(joinData.token).toBeDefined();

    // 3. Reconnect with token
    const reconnectReq = new NextRequest("http://localhost:3000/api/sessions/reconnect", {
      method: "POST",
      body: JSON.stringify({
        token: joinData.token,
      }),
    });
    const reconnectRes = await reconnectRoute(reconnectReq);
    expect(reconnectRes.status).toBe(200);
    const reconnected = await reconnectRes.json();
    expect(reconnected.id).toBe(joinData.participant.id);

    // 4. GET /api/sessions/:id
    const getReq = new NextRequest(`http://localhost:3000/api/sessions/${session.id}`);
    const getRes = await getSessionRoute(getReq, { params: { id: session.id } });
    expect(getRes.status).toBe(200);
    const fullSession = await getRes.json();
    expect(fullSession.participants).toHaveLength(1);
    expect(fullSession.participants[0].displayName).toBe("Dwight Schrute");
  });
});
