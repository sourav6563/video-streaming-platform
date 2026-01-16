import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import { logger } from "../utils/logger";
import { env } from "../env";

// Configure cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath: string): Promise<UploadApiResponse | null> => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    logger.info(`File uploaded on cloudinary: ${response.url}`);

    // Once the file is uploaded, delete the local file
    await unlink(localFilePath);

    return response;
  } catch (error) {
    logger.error("Error uploading file to cloudinary:", error);

    // Clean up local file even if upload fails
    try {
      if (existsSync(localFilePath)) {
        await unlink(localFilePath);
      }
    } catch (unlinkError) {
      logger.error("Error deleting local file:", unlinkError);
    }

    return null;
  }
};

const deleteOnCloudinary = async (publicId: string): Promise<{ result: string } | null> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`File deleted from cloudinary. publicId: ${publicId}`);
    return result;
  } catch (error) {
    logger.error("Error while deleting file on cloudinary:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
