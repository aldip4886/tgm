import { prisma } from "../lib/db";

export interface LinkPresentationInput {
  canvaPresentationUrl: string;
  canvaSlideCount?: number;
}

export async function linkPresentation(sessionId: string, input: LinkPresentationInput) {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.session.update({
      where: { id: sessionId },
      data: {
        canvaPresentationUrl: input.canvaPresentationUrl.trim(),
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
