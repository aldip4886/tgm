import { prisma } from "../lib/db";

export interface LinkPresentationInput {
  canvaPresentationUrl: string;
  canvaSlideCount?: number;
}

export function sanitizeCanvaUrl(rawInput: string): string {
  if (!rawInput) return "";
  let url = rawInput.trim();

  // If user pasted an iframe embed code (e.g. <iframe ... src="..." ...></iframe>)
  const iframeMatch = url.match(/src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    url = iframeMatch[1].trim();
  }

  // If it is a Canva link with /view, ensure it has ?embed
  if (url.includes("canva.com") && url.includes("/view") && !url.includes("embed")) {
    url = url.replace("/view", "/view?embed");
  }

  return url;
}

export async function linkPresentation(sessionId: string, input: LinkPresentationInput) {
  const cleanUrl = sanitizeCanvaUrl(input.canvaPresentationUrl);

  return await prisma.$transaction(async (tx) => {
    const session = await tx.session.update({
      where: { id: sessionId },
      data: {
        canvaPresentationUrl: cleanUrl,
        canvaSlideCount: input.canvaSlideCount || 1,
      },
    });

    await tx.event.create({
      data: {
        sessionId,
        eventType: "PRESENTATION_CONNECTED",
        metadata: JSON.stringify({
          url: session.canvaPresentationUrl,
          slideCount: session.canvaSlideCount,
        }),
      },
    });

    return session;
  });
}

export async function unlinkPresentation(sessionId: string) {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.session.update({
      where: { id: sessionId },
      data: {
        canvaPresentationUrl: null,
        canvaSlideCount: 0,
      },
    });

    await tx.event.create({
      data: {
        sessionId,
        eventType: "PRESENTATION_DISCONNECTED",
        metadata: JSON.stringify({
          unlinkedAt: new Date().toISOString(),
        }),
      },
    });

    return session;
  });
}

export interface CreateMappingInput {
  slideNumber: number;
  title: string;
  checkpoint?: string;
  activityId?: string;
}

export async function createPresentationMapping(sessionId: string, input: CreateMappingInput) {
  return await prisma.$transaction(async (tx) => {
    const mapping = await tx.presentationMapping.create({
      data: {
        sessionId,
        slideNumber: input.slideNumber,
        title: input.title.trim(),
        checkpoint: input.checkpoint?.trim(),
        activityId: input.activityId,
      },
    });

    await tx.event.create({
      data: {
        sessionId,
        activityId: input.activityId,
        eventType: "PRESENTATION_MAPPING_CREATED",
        metadata: JSON.stringify({
          mappingId: mapping.id,
          slideNumber: mapping.slideNumber,
          title: mapping.title,
        }),
      },
    });

    return mapping;
  });
}

export async function getPresentationMappings(sessionId: string) {
  return await prisma.presentationMapping.findMany({
    where: { sessionId },
    orderBy: { slideNumber: "asc" },
  });
}

export async function recordSlideView(sessionId: string, slideNumber: number) {
  return await prisma.event.create({
    data: {
      sessionId,
      eventType: "PRESENTATION_PAGE_VIEWED",
      metadata: JSON.stringify({ slideNumber }),
    },
  });
}
