# CloudFront + S3 Integration

## Where CloudFront is applied

All runtime file traffic goes through **`utils/s3Functions.js`**. There is no separate S3 upload path that bypasses it.

| Operation | Implementation | Public URL |
|-----------|------------------|------------|
| Upload (single / multipart) | `uploadImage` | `getPublicFileUrl` → CloudFront if configured, else S3 |
| Upload (batch) | `uploadMultipleImages` | Same |
| Delete | `deleteImage`, `deleteFromS3` | Deletes by S3 key extracted from **CloudFront or S3** URL |

Call sites (all use `uploadImage` / `deleteImage` / `deleteFromS3` from `s3Functions`):

- `adminPanel/controllers/course/courseController.js`, `lessonController.js`, `subcourseController.js`
- `adminPanel/controllers/activity/activityController.js`
- `adminPanel/controllers/profile/profileController.js`
- `adminPanel/controllers/uploadInternshipLetter/uploadInternshipLetterController.js`
- `userPanel/controllers/profile/profileController.js`
- `Promo/controllers/promoController.js`
- `other_modules/uploloadImages.js`

**Database migration** (`other_modules/migrateS3ToCloudFront.js`) rewrites stored **direct S3** URLs to CloudFront using the same `getPublicFileUrl` logic as the app, so migrated rows match new uploads.

Exported helpers (for scripts/tests): `getCloudFrontBaseUrl`, `getPublicFileUrl`, `extractKeyFromPublicUrl` on `utils/s3Functions.js`.

---

## Configuration checklist

### 1. AWS S3 (already required for uploads)

| Variable | Purpose |
|----------|---------|
| `AWS_S3_BUCKET_NAME` | Bucket name |
| `AWS_REGION` | Region (e.g. `ap-south-1`) |
| `AWS_ACCESS_KEY_ID` | API access for uploads/deletes |
| `AWS_SECRET_ACCESS_KEY` | Secret |

### 2. CloudFront public URLs (required for CDN URLs)

Set **one** of these (both are supported; `CLOUDFRONT_URL` is preferred):

| Variable | Example |
|----------|---------|
| `CLOUDFRONT_URL` | `https://dxxxxxxxxxxxx.cloudfront.net` |
| `CDN_BASE_URL` | Same value (alias for older configs) |

Rules:

- Use **`https://`**
- **No trailing slash**
- Value is the **distribution domain** (or custom CDN hostname), not the S3 origin URL

If neither is set, the API still uploads to S3 but returns **direct S3 URLs** (`https://<bucket>.s3.amazonaws.com/...`).

### 3. App and migration

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | Required for `migrateS3ToCloudFront.js` |

After changing `.env`, **restart the Node process**.

---

## AWS CloudFront setup (summary)

1. **CloudFront** → Create distribution  
   - **Origin**: your bucket (e.g. `your-bucket.s3.ap-south-1.amazonaws.com` or REST endpoint)  
   - **Viewer protocol**: Redirect HTTP to HTTPS  
   - **Allowed methods**: at least GET, HEAD, OPTIONS (for static assets)  
   - **OAC / OAI** (recommended) or public bucket, per your security model  

2. Wait until status is **Deployed**, then copy the **distribution domain** (e.g. `d123.cloudfront.net`).

3. Set `CLOUDFRONT_URL=https://d123.cloudfront.net` in `.env` and restart the backend.

4. **Optional**: Custom domain → ACM certificate (often `us-east-1` for CloudFront), alias in Route 53, then set `CLOUDFRONT_URL=https://cdn.yourdomain.com`.

---

## How URLs look

- **With CloudFront**: `https://dxxxx.cloudfront.net/courses/coverImage/123_image.jpg`
- **Without** (fallback): `https://<bucket>.s3.amazonaws.com/courses/coverImage/123_image.jpg`

Deletes accept either form; the key is taken from the URL path.

---

## Migrating existing S3 URLs in MongoDB

Prerequisites: `CLOUDFRONT_URL` or `CDN_BASE_URL`, `MONGO_URI`, `AWS_S3_BUCKET_NAME` aligned with stored URLs, **DB backup**.

```bash
# Dry run (default)
node other_modules/migrateS3ToCloudFront.js

# Apply
node other_modules/migrateS3ToCloudFront.js --live
```

The script matches both **global** (`bucket.s3.amazonaws.com`) and **regional** (`bucket.s3.ap-south-1.amazonaws.com`) virtual-hosted URLs for your bucket name.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Responses still show `s3.amazonaws.com` | `CLOUDFRONT_URL` / `CDN_BASE_URL` set, no typo, restart server |
| 403/404 from CloudFront | Origin permissions (OAC), bucket policy, distribution deployed |
| Stale file after overwrite | CloudFront invalidation for that path or `/*` |
| Migration finds 0 docs | Bucket name in `.env` matches URLs in DB; URLs may use a different host pattern |
