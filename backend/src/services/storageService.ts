import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible storage service.
 * Works with AWS S3, Cloudflare R2, Supabase Storage, or MinIO
 * by setting S3_ENDPOINT to the provider's endpoint URL.
 */

function createS3Client(): S3Client {
  const endpoint = process.env.S3_ENDPOINT;
  return new S3Client({
    region: process.env.S3_REGION ?? "auto",
    ...(endpoint && { endpoint }),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
    // Required for path-style access (needed by some S3-compatible services)
    forcePathStyle: !!endpoint,
  });
}

const client = createS3Client();
const BUCKET = process.env.S3_BUCKET ?? "interview-platform";

export const storageService = {
  /**
   * Upload a buffer to S3-compatible storage.
   * @param key  - Object key (path) within the bucket
   * @param body - File buffer
   * @param contentType - MIME type
   */
  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Objects are private by default — never set ACL to public-read
      })
    );
  },

  /**
   * Generate a short-lived presigned GET URL.
   * Use this instead of ever returning the raw bucket key/URL to the frontend.
   *
   * @param key       - Object key in the bucket
   * @param expiresIn - Expiry in seconds (default: 1 hour)
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return getSignedUrl(client, command, { expiresIn });
  },
};
