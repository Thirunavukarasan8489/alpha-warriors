import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { uploadToCloudinary, deleteFromCloudinary, UploadOptions } from "@/lib/cloudinary";

const ALLOWED_FOLDERS = ["members", "staff", "branding", "products", "general"] as const;

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager", "receptionist", "trainer"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const contentType = req.headers.get("content-type") || "";
    let fileData: string = "";
    let requestedFolder: UploadOptions["folder"] = "members";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const folderVal = formData.get("folder") as string | null;

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "No image file provided" } },
          { status: 422 }
        );
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: { code: "INVALID_FILE_TYPE", message: "Only image files (JPEG, PNG, WEBP) are supported" } },
          { status: 422 }
        );
      }

      // Max size: 10MB
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: { code: "FILE_TOO_LARGE", message: "Image exceeds maximum allowed size (10MB)" } },
          { status: 422 }
        );
      }

      if (folderVal && (ALLOWED_FOLDERS as readonly string[]).includes(folderVal)) {
        requestedFolder = folderVal as UploadOptions["folder"];
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fileData = `data:${file.type};base64,${buffer.toString("base64")}`;
    } else {
      // JSON payload containing Base64 data URL
      const body = await req.json();
      const { image, folder } = body;

      if (!image || typeof image !== "string") {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Image data string is required" } },
          { status: 422 }
        );
      }

      if (folder && (ALLOWED_FOLDERS as readonly string[]).includes(folder)) {
        requestedFolder = folder as UploadOptions["folder"];
      }

      fileData = image;
    }

    const uploadResult = await uploadToCloudinary(fileData, {
      gymId: auth.gymId,
      folder: requestedFolder,
      maxDim: requestedFolder === "members" ? 800 : 1200,
    });

    return NextResponse.json({
      data: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
      },
    });
  } catch (error: unknown) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json(
      {
        error: {
          code: "UPLOAD_FAILED",
          message: (error as Error).message || "Failed to upload image to cloud storage",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager", "receptionist"]);
  if ("response" in authResult) return authResult.response;

  try {
    const { publicId } = await req.json();
    if (!publicId || typeof publicId !== "string") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Image publicId is required" } },
        { status: 422 }
      );
    }

    const deleted = await deleteFromCloudinary(publicId);
    return NextResponse.json({ data: { success: deleted } });
  } catch (error: unknown) {
    console.error("Cloudinary delete error:", error);
    return NextResponse.json(
      { error: { code: "DELETE_FAILED", message: "Failed to remove image asset" } },
      { status: 500 }
    );
  }
}
