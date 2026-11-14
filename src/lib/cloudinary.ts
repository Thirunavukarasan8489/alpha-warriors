import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadOptions {
  folder: "members" | "staff" | "branding" | "products" | "general";
  gymId: string;
  publicId?: string;
  tags?: string[];
  maxDim?: number;
}

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Uploads an image (data URI, base64, or remote URL) to Cloudinary
 * with strict multi-tenant folder isolation.
 *
 * Folder Structure:
 * alpha-warriors/{gymId}/{folder}/...
 */
export async function uploadToCloudinary(
  fileData: string,
  options: UploadOptions
): Promise<UploadResult> {
  const { folder, gymId, publicId, tags = [], maxDim = 1200 } = options;

  // Cloudinary structured directory
  const targetFolder = `alpha-warriors/${gymId}/${folder}`;

  const response: UploadApiResponse = await cloudinary.uploader.upload(fileData, {
    folder: targetFolder,
    public_id: publicId,
    resource_type: "image",
    overwrite: true,
    tags: ["alpha-warriors", gymId, folder, ...tags],
    transformation: [
      {
        width: maxDim,
        height: maxDim,
        crop: "limit",
        quality: "auto:good",
        fetch_format: "auto",
      },
    ],
  });

  return {
    url: response.secure_url,
    publicId: response.public_id,
    width: response.width,
    height: response.height,
    format: response.format,
    bytes: response.bytes,
  };
}

/**
 * Safely removes an image asset from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
    return result.result === "ok";
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return false;
  }
}

export { cloudinary };
