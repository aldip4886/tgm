import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { createSession } from "../src/services/session.service";
import {
  linkPresentation,
  createPresentationMapping,
  getPresentationMappings,
  recordSlideView,
  sanitizeCanvaUrl,
} from "../src/services/presentation.service";

describe("Ticket 02: Presentation Link & Split Workspace with Projector View", () => {
  beforeEach(async () => {
    await prisma.event.deleteMany();
    await prisma.presentationMapping.deleteMany();
    await prisma.sessionParticipant.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it("facilitator can link a Canva presentation to a session", async () => {
    const session = await createSession({
      title: "Agile Leadership",
      facilitatorName: "Coach Dan",
      facilitatorEmail: "dan@agile.org",
    });

    const updated = await linkPresentation(session.id, {
      canvaPresentationUrl: "https://www.canva.com/design/DAF12345/view",
      canvaSlideCount: 15,
    });

    expect(updated.canvaPresentationUrl).toBe("https://www.canva.com/design/DAF12345/view?embed");
    expect(updated.canvaSlideCount).toBe(15);

    // Event log
    const events = await prisma.event.findMany({
      where: { sessionId: session.id, eventType: "PRESENTATION_CONNECTED" },
    });
    expect(events).toHaveLength(1);
  });

  it("sanitizes Canva raw URL and iframe embed HTML code", () => {
    const rawUrl = "https://www.canva.com/design/DAF12345/view";
    expect(sanitizeCanvaUrl(rawUrl)).toBe("https://www.canva.com/design/DAF12345/view?embed");

    const embedHtml = `<div style="position: relative;"><iframe loading="lazy" src="https://www.canva.com/design/DAGabcdef/view?embed" allowfullscreen="allowfullscreen"></iframe></div>`;
    expect(sanitizeCanvaUrl(embedHtml)).toBe("https://www.canva.com/design/DAGabcdef/view?embed");
  });

  it("facilitator can create presentation mappings for slides to checkpoints", async () => {
    const session = await createSession({
      title: "Design Sprint Workshop",
      facilitatorName: "Coach Dan",
      facilitatorEmail: "dan@agile.org",
    });

    await linkPresentation(session.id, {
      canvaPresentationUrl: "https://www.canva.com/design/DAF12345/view",
      canvaSlideCount: 10,
    });

    const mapping1 = await createPresentationMapping(session.id, {
      slideNumber: 1,
      title: "Sprint Introduction",
      checkpoint: "Welcome & Context",
    });

    const mapping2 = await createPresentationMapping(session.id, {
      slideNumber: 4,
      title: "Problem Statement Challenge",
      checkpoint: "Icebreaker Activity",
    });

    expect(mapping1.slideNumber).toBe(1);
    expect(mapping2.slideNumber).toBe(4);

    const mappings = await getPresentationMappings(session.id);
    expect(mappings).toHaveLength(2);
    expect(mappings[0].title).toBe("Sprint Introduction");
    expect(mappings[1].title).toBe("Problem Statement Challenge");
  });

  it("records slide navigation events to the event log", async () => {
    const session = await createSession({
      title: "Design Sprint Workshop",
      facilitatorName: "Coach Dan",
      facilitatorEmail: "dan@agile.org",
    });

    await recordSlideView(session.id, 5);

    const events = await prisma.event.findMany({
      where: { sessionId: session.id, eventType: "PRESENTATION_PAGE_VIEWED" },
    });
    expect(events).toHaveLength(1);
    expect(JSON.parse(events[0].metadata || "{}").slideNumber).toBe(5);
  });
});
