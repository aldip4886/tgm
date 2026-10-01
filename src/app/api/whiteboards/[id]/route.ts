import { NextRequest, NextResponse } from "next/server";
import {
  getWhiteboardById,
  saveWhiteboardScene,
  submitWhiteboard,
} from "@/services/whiteboard.service";
import { z } from "zod";

const updateSchema = z.object({
  action: z.enum(["save", "submit"]).default("save"),
  sceneData: z.string(),
  actorId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const whiteboard = await getWhiteboardById(id);
    if (!whiteboard) {
      return NextResponse.json({ error: "Whiteboard not found" }, { status: 404 });
    }
    return NextResponse.json(whiteboard);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    if (data.action === "submit") {
      const updated = await submitWhiteboard(id, data.actorId || "unknown", data.sceneData);
      return NextResponse.json(updated);
    } else {
      const updated = await saveWhiteboardScene(id, data.sceneData, data.actorId);
      return NextResponse.json(updated);
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
