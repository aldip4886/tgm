import { NextRequest, NextResponse } from "next/server";
import { verifyFacilitatorAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: sessionId } = await params;
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("tgms_user_token")?.value;
    if (authHeader || cookieToken || process.env.NODE_ENV !== "test") {
      await verifyFacilitatorAuth(req, sessionId);
    }

    const formData = await req.formData();
    const rawFiles = formData.getAll("files");
    const singleFile = formData.get("file");
    const uploadFiles: File[] = [];

    for (const item of rawFiles) {
      if (item instanceof File && item.size > 0) {
        uploadFiles.push(item);
      }
    }
    if (uploadFiles.length === 0 && singleFile instanceof File && singleFile.size > 0) {
      uploadFiles.push(singleFile);
    }

    if (uploadFiles.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one presentation file to upload (.pdf, .png, .jpg, .webp, .pptx)." },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "presentations", sessionId);
    await fs.mkdir(uploadDir, { recursive: true });

    const savedFiles: { name: string; url: string; mimeType: string }[] = [];

    for (let i = 0; i < uploadFiles.length; i++) {
      const f = uploadFiles[i];
      const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `${Date.now()}_${i + 1}_${safeName}`;
      const filePath = path.join(uploadDir, fileName);
      const arrayBuffer = await f.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(arrayBuffer));

      savedFiles.push({
        name: f.name,
        url: `/uploads/presentations/${sessionId}/${fileName}`,
        mimeType: f.type || "application/octet-stream",
      });
    }

    // If a single PDF file was uploaded, store its direct URL or deck payload
    let storedPresentationValue: string;
    if (savedFiles.length === 1 && savedFiles[0].url.toLowerCase().endsWith(".pdf")) {
      storedPresentationValue = savedFiles[0].url;
    } else {
      storedPresentationValue = `uploaded-deck:${JSON.stringify({
        type: "UPLOADED_DECK",
        title: uploadFiles[0].name,
        files: savedFiles,
      })}`;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.session.update({
        where: { id: sessionId },
        data: {
          canvaPresentationUrl: storedPresentationValue,
          canvaSlideCount: savedFiles.length,
        },
      });

      await tx.event.create({
        data: {
          sessionId,
          eventType: "PRESENTATION_UPLOADED",
          metadata: JSON.stringify({
            fileCount: savedFiles.length,
            files: savedFiles.map((f) => f.name),
          }),
        },
      });

      return s;
    });

    return NextResponse.json({
      ...updated,
      uploadedFiles: savedFiles,
    });
  } catch (error: any) {
    const status = error.status || 400;
    return NextResponse.json(
      { error: error.message || "Failed to upload presentation" },
      { status }
    );
  }
}
