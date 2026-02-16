# CloudFront + S3 Integration Setup Guide

## Overview
This backend now supports CloudFront CDN for serving files from S3. When `CDN_BASE_URL` is configured, all file URLs will use CloudFront instead of direct S3 URLs.

## Environment Variables

Add the following to your `.env` file:

```env
# Existing S3 configuration
AWS_S3_BUCKET_NAME=yoraaecommerce
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# CloudFront CDN Configuration (NEW)
CDN_BASE_URL=https://d3bi5d5em13bi2.cloudfront.net
```

**Note:** 
- Use `https://` protocol (not `http://`)
- Do NOT include trailing slash
- If `CDN_BASE_URL` is not set or empty, the system will fallback to direct S3 URLs

## AWS CloudFront Setup Steps

### 1. Create CloudFront Distribution

1. Go to AWS Console → CloudFront
2. Click "Create Distribution"
3. Configure:
   - **Origin Domain**: Select your S3 bucket (`yoraaecommerce.s3.ap-south-1.amazonaws.com`)
   - **Origin Access**: 
     - Option A: Public bucket (simpler, less secure)
     - Option B: Origin Access Control (OAC) - Recommended for better security
   - **Viewer Protocol Policy**: Redirect HTTP to HTTPS (recommended)
   - **Allowed HTTP Methods**: GET, HEAD, OPTIONS
   - **Cache Policy**: Use "CachingOptimized" or create custom policy
   - **Price Class**: Choose based on your needs

4. Click "Create Distribution"
5. Wait for distribution to deploy (5-15 minutes)
6. Copy the **Distribution Domain Name** (e.g., `d3bi5d5em13bi2.cloudfront.net`)

### 2. Update Environment Variable

Add the CloudFront domain to your `.env`:

```env
CDN_BASE_URL=https://d3bi5d5em13bi2.cloudfront.net
```

### 3. Restart Your Backend

After updating `.env`, restart your Node.js backend server.

## How It Works

### URL Generation

- **With CloudFront**: `https://d3bi5d5em13bi2.cloudfront.net/user/profile/user_123/avatar.jpg`
- **Without CloudFront** (fallback): `https://yoraaecommerce.s3.amazonaws.com/user/profile/user_123/avatar.jpg`

### File Operations

- **Upload**: Files are uploaded to S3, URLs returned use CloudFront (if configured)
- **Delete**: Works with both CloudFront and S3 URLs (extracts key from pathname)
- **No Frontend Changes**: Frontend continues to receive full HTTPS URLs, no code changes needed

## Benefits

1. **Faster Delivery**: CloudFront CDN caches files at edge locations globally
2. **Lower Costs**: Reduced S3 data transfer costs
3. **Better Performance**: Reduced latency for users worldwide
4. **Zero Frontend Changes**: Backend handles URL generation transparently

## Testing

After setup, test by uploading a file and verifying the returned URL uses your CloudFront domain:

```javascript
// Example response
{
  "url": "https://d3bi5d5em13bi2.cloudfront.net/courses/coverImage/1234567890_image.jpg"
}
```

## Troubleshooting

### Files not loading via CloudFront

1. **Check CloudFront Distribution Status**: Must be "Deployed"
2. **Verify S3 Bucket Permissions**: Ensure CloudFront can access the bucket
3. **Check CORS Settings**: If accessing from browser, ensure CORS is configured
4. **Cache Invalidation**: If you updated existing files, invalidate CloudFront cache:
   - Go to CloudFront → Invalidations → Create Invalidation
   - Enter path: `/*` (or specific file path)

### Fallback to S3 URLs

- Check `.env` file has `CDN_BASE_URL` set correctly
- Ensure no trailing slash in `CDN_BASE_URL`
- Restart backend after changing `.env`

## Optional: Custom Domain

To use a custom domain (e.g., `cdn.yourdomain.com`):

1. Request SSL certificate in AWS Certificate Manager (ACM) - **Must be in us-east-1 region**
2. Add CNAME record in Route 53 pointing to CloudFront distribution
3. Update `CDN_BASE_URL` in `.env`:
   ```env
   CDN_BASE_URL=https://cdn.yourdomain.com
   ```

## Migration Notes

- **Existing URLs**: Old URLs in database pointing to S3 will still work (S3 remains accessible)
- **New Uploads**: Will automatically use CloudFront URLs
- **Optional Migration**: Run a script to update existing database URLs if needed

## Migrating Existing S3 URLs to CloudFront

If you have existing S3 URLs stored in your database and want to convert them to CloudFront URLs, use the provided migration script.

### Prerequisites

1. Ensure `CDN_BASE_URL` is set in your `.env` file
2. Ensure `MONGO_URI` is set in your `.env` file
3. Backup your database before running the migration

### Running the Migration

#### Step 1: Dry Run (Recommended First)

Test the migration without making changes:

```bash
node other_modules/migrateS3ToCloudFront.js
```

This will:
- Show you how many documents will be updated
- Display which fields will be changed
- **NOT make any actual changes** to the database

#### Step 2: Live Migration

After reviewing the dry run results, run the actual migration:

```bash
node other_modules/migrateS3ToCloudFront.js --live
```

### What Gets Migrated

The script migrates S3 URLs in the following models and fields:

- **Subcourses**: `introVideoUrl`, `thumbnailImageUrl`, `recordedlessonsLink`
- **Lessons**: `introVideoUrl`, `thumbnailImageUrl`, `recordedVideoLink`
- **Courses**: `CoverImageUrl`
- **Promos**: `promo`
- **Admin Profiles**: `profileImageUrl`
- **User Profiles**: `profileImageUrl`
- **Internship Letters**: `fileUrl`, `letterUrl`, `documentUrl`
- **Certificate Templates**: HTML content (all S3 URLs in template HTML)
- **Recorded Lessons**: `videoUrl`, `videoLink`, `thumbnailUrl`

### Example Output

```
============================================================
🔄 S3 to CloudFront URL Migration
============================================================
S3 Bucket: yoraaecommerce
CloudFront URL: https://d3bi5d5em13bi2.cloudfront.net
Mode: DRY RUN (no changes)
============================================================

📡 Connecting to MongoDB...
✅ Connected to MongoDB

📚 Migrating Subcourses...
Found 15 subcourses with S3 URLs
  Updating subcourse: 507f1f77bcf86cd799439011
    Fields: introVideoUrl, thumbnailImageUrl
✅ Updated 15 subcourses

📖 Migrating Lessons...
Found 42 lessons with S3 URLs
✅ Updated 42 lessons

...

============================================================
📊 Migration Summary
============================================================
Subcourses:        15
Lessons:           42
Courses:           8
Promos:            5
Admin Profiles:    2
User Profiles:     150
Internship Letters: 0
Cert Templates:    1
Recorded Lessons:   12
------------------------------------------------------------
Total Updated:     235 documents
============================================================
```

### Safety Features

- **Dry Run Mode**: Default mode shows what will change without modifying data
- **Selective Updates**: Only updates URLs that match S3 pattern
- **Non-destructive**: Leaves non-S3 URLs unchanged
- **Detailed Logging**: Shows exactly what fields are being updated

### Troubleshooting Migration

1. **No URLs Found**: If the script reports 0 documents found, verify:
   - Your database contains S3 URLs (check a few documents manually)
   - The `AWS_S3_BUCKET_NAME` in `.env` matches your bucket name

2. **Connection Errors**: Ensure:
   - `MONGO_URI` is correctly set in `.env`
   - MongoDB is accessible from your server
   - Network/firewall allows connection

3. **Partial Updates**: If migration stops mid-way:
   - The script is safe to re-run (it only updates S3 URLs)
   - Already converted URLs won't be changed again
   - Run dry-run again to see remaining URLs

### After Migration

1. **Verify**: Check a few documents in your database to confirm URLs are updated
2. **Test**: Access a few migrated URLs via CloudFront to ensure they work
3. **Monitor**: Watch for any 404 errors in your application logs
4. **Cache**: Consider invalidating CloudFront cache if needed (see Troubleshooting section)
