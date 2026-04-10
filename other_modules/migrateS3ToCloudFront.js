require("dotenv").config();
const mongoose = require("mongoose");
const { getPublicFileUrl, getCloudFrontBaseUrl } = require("../utils/s3Functions");

// Import all models that contain S3 URLs
const Subcourse = require("../adminPanel/models/course/subcourse");
const Lesson = require("../adminPanel/models/course/lesson");
const Course = require("../adminPanel/models/course/course");
const Promo = require("../Promo/models/promo");
const AdminProfile = require("../adminPanel/models/profile/profile");
const UserProfile = require("../userPanel/models/Profile/userProfile");
const InternshipLetter = require("../adminPanel/models/InternshipLetter/internshipLetter");
const CertificateTemplate = require("../adminPanel/models/Templates/certificateTemplate");
const RecordedLesson = require("../userPanel/models/recordedLesson/recordedLesson");

// Configuration (public URLs must match utils/s3Functions.js — use getPublicFileUrl)
const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "yoraaecommerce";

/** Match legacy global or regional virtual-hosted S3 URLs for this bucket. */
const S3_URL_PATTERN = new RegExp(
  `https://${S3_BUCKET_NAME}\\.s3(?:\\.[a-z0-9-]+)?\\.amazonaws\\.com/(.+)`,
  "i"
);

function extractS3KeyFromUrl(s3Url) {
  if (!s3Url || typeof s3Url !== "string") return null;
  const match = s3Url.match(S3_URL_PATTERN);
  return match ? match[1] : null;
}

/**
 * Convert direct S3 URL to CloudFront (or CDN_BASE) URL using the same helper as runtime uploads.
 */
function convertS3ToCloudFront(s3Url) {
  if (!s3Url || typeof s3Url !== "string") return s3Url;
  const fileKey = extractS3KeyFromUrl(s3Url);
  if (!fileKey) return s3Url;
  return getPublicFileUrl(fileKey);
}

/**
 * Update URLs in an object recursively
 */
function updateUrlsInObject(obj, fieldsToUpdate) {
  let updated = false;
  const updates = {};
  
  for (const field of fieldsToUpdate) {
    if (obj[field] && typeof obj[field] === "string") {
      const newUrl = convertS3ToCloudFront(obj[field]);
      if (newUrl !== obj[field]) {
        updates[field] = newUrl;
        updated = true;
      }
    }
  }
  
  return { updated, updates };
}

/**
 * Update URLs in HTML content (for certificate templates)
 */
function updateUrlsInHtml(html) {
  if (!html || typeof html !== "string") return html;
  
  return html.replace(
    new RegExp(
      `https://${S3_BUCKET_NAME}\\.s3(?:\\.[a-z0-9-]+)?\\.amazonaws\\.com/([^"'\\)\\s]+)`,
      "gi"
    ),
    (match, fileKey) => getPublicFileUrl(fileKey)
  );
}

/**
 * Migrate Subcourses
 */
async function migrateSubcourses(dryRun = false) {
  console.log("\n📚 Migrating Subcourses...");
  const subcourses = await Subcourse.find({
    $or: [
      { introVideoUrl: S3_URL_PATTERN },
      { thumbnailImageUrl: S3_URL_PATTERN },
      { recordedlessonsLink: S3_URL_PATTERN },
    ],
  });

  console.log(`Found ${subcourses.length} subcourses with S3 URLs`);

  let updated = 0;
  for (const subcourse of subcourses) {
    const { updates } = updateUrlsInObject(subcourse, [
      "introVideoUrl",
      "thumbnailImageUrl",
      "recordedlessonsLink",
    ]);

    if (Object.keys(updates).length > 0) {
      console.log(`  Updating subcourse: ${subcourse._id}`);
      console.log(`    Fields: ${Object.keys(updates).join(", ")}`);
      
      if (!dryRun) {
        await Subcourse.updateOne({ _id: subcourse._id }, { $set: updates });
      }
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} subcourses`);
  return updated;
}

/**
 * Migrate Lessons
 */
async function migrateLessons(dryRun = false) {
  console.log("\n📖 Migrating Lessons...");
  const lessons = await Lesson.find({
    $or: [
      { introVideoUrl: S3_URL_PATTERN },
      { thumbnailImageUrl: S3_URL_PATTERN },
      { recordedVideoLink: S3_URL_PATTERN },
    ],
  });

  console.log(`Found ${lessons.length} lessons with S3 URLs`);

  let updated = 0;
  for (const lesson of lessons) {
    const { updates } = updateUrlsInObject(lesson, [
      "introVideoUrl",
      "thumbnailImageUrl",
      "recordedVideoLink",
    ]);

    if (Object.keys(updates).length > 0) {
      console.log(`  Updating lesson: ${lesson._id}`);
      console.log(`    Fields: ${Object.keys(updates).join(", ")}`);
      
      if (!dryRun) {
        await Lesson.updateOne({ _id: lesson._id }, { $set: updates });
      }
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} lessons`);
  return updated;
}

/**
 * Migrate Courses
 */
async function migrateCourses(dryRun = false) {
  console.log("\n🎓 Migrating Courses...");
  const courses = await Course.find({
    CoverImageUrl: S3_URL_PATTERN,
  });

  console.log(`Found ${courses.length} courses with S3 URLs`);

  let updated = 0;
  for (const course of courses) {
    const newUrl = convertS3ToCloudFront(course.CoverImageUrl);
    if (newUrl !== course.CoverImageUrl) {
      console.log(`  Updating course: ${course._id}`);
      
      if (!dryRun) {
        await Course.updateOne(
          { _id: course._id },
          { $set: { CoverImageUrl: newUrl } }
        );
      }
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} courses`);
  return updated;
}

/**
 * Migrate Promos
 */
async function migratePromos(dryRun = false) {
  console.log("\n🎨 Migrating Promos...");
  const promos = await Promo.find({
    promo: S3_URL_PATTERN,
  });

  console.log(`Found ${promos.length} promos with S3 URLs`);

  let updated = 0;
  for (const promo of promos) {
    const newUrl = convertS3ToCloudFront(promo.promo);
    if (newUrl !== promo.promo) {
      console.log(`  Updating promo: ${promo._id}`);
      
      if (!dryRun) {
        await Promo.updateOne({ _id: promo._id }, { $set: { promo: newUrl } });
      }
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} promos`);
  return updated;
}

/**
 * Migrate Admin Profiles
 */
async function migrateAdminProfiles(dryRun = false) {
  console.log("\n👤 Migrating Admin Profiles...");
  const profiles = await AdminProfile.find({
    profileImageUrl: S3_URL_PATTERN,
  });

  console.log(`Found ${profiles.length} admin profiles with S3 URLs`);

  let updated = 0;
  for (const profile of profiles) {
    const newUrl = convertS3ToCloudFront(profile.profileImageUrl);
    if (newUrl !== profile.profileImageUrl) {
      console.log(`  Updating admin profile: ${profile._id}`);
      
      if (!dryRun) {
        await AdminProfile.updateOne(
          { _id: profile._id },
          { $set: { profileImageUrl: newUrl } }
        );
      }
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} admin profiles`);
  return updated;
}

/**
 * Migrate User Profiles
 */
async function migrateUserProfiles(dryRun = false) {
  console.log("\n👥 Migrating User Profiles...");
  const profiles = await UserProfile.find({
    profileImageUrl: S3_URL_PATTERN,
  });

  console.log(`Found ${profiles.length} user profiles with S3 URLs`);

  let updated = 0;
  for (const profile of profiles) {
    const newUrl = convertS3ToCloudFront(profile.profileImageUrl);
    if (newUrl !== profile.profileImageUrl) {
      console.log(`  Updating user profile: ${profile._id}`);
      
      if (!dryRun) {
        await UserProfile.updateOne(
          { _id: profile._id },
          { $set: { profileImageUrl: newUrl } }
        );
      }
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} user profiles`);
  return updated;
}

/**
 * Migrate Internship Letters
 */
async function migrateInternshipLetters(dryRun = false) {
  console.log("\n📄 Migrating Internship Letters...");
  
  // Check common URL fields in internship letter model
  const letters = await InternshipLetter.find({
    $or: [
      { fileUrl: S3_URL_PATTERN },
      { letterUrl: S3_URL_PATTERN },
      { documentUrl: S3_URL_PATTERN },
    ],
  });

  console.log(`Found ${letters.length} internship letters with S3 URLs`);

  let updated = 0;
  for (const letter of letters) {
    const { updates } = updateUrlsInObject(letter, [
      "fileUrl",
      "letterUrl",
      "documentUrl",
    ]);

    if (Object.keys(updates).length > 0) {
      console.log(`  Updating internship letter: ${letter._id}`);
      
      if (!dryRun) {
        await InternshipLetter.updateOne(
          { _id: letter._id },
          { $set: updates }
        );
      }
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} internship letters`);
  return updated;
}

/**
 * Migrate Certificate Templates (HTML content)
 */
async function migrateCertificateTemplates(dryRun = false) {
  console.log("\n📜 Migrating Certificate Templates...");
  const templates = await CertificateTemplate.find({
    content: S3_URL_PATTERN,
  });

  console.log(`Found ${templates.length} certificate templates with S3 URLs`);

  let updated = 0;
  for (const template of templates) {
    const newContent = updateUrlsInHtml(template.content);
    if (newContent !== template.content) {
      console.log(`  Updating certificate template: ${template._id}`);
      
      if (!dryRun) {
        await CertificateTemplate.updateOne(
          { _id: template._id },
          { $set: { content: newContent } }
        );
      }
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} certificate templates`);
  return updated;
}

/**
 * Migrate Recorded Lessons
 */
async function migrateRecordedLessons(dryRun = false) {
  console.log("\n🎬 Migrating Recorded Lessons...");
  
  // Check common URL fields
  const lessons = await RecordedLesson.find({
    $or: [
      { videoUrl: S3_URL_PATTERN },
      { videoLink: S3_URL_PATTERN },
      { thumbnailUrl: S3_URL_PATTERN },
    ],
  });

  console.log(`Found ${lessons.length} recorded lessons with S3 URLs`);

  let updated = 0;
  for (const lesson of lessons) {
    const { updates } = updateUrlsInObject(lesson, [
      "videoUrl",
      "videoLink",
      "thumbnailUrl",
    ]);

    if (Object.keys(updates).length > 0) {
      console.log(`  Updating recorded lesson: ${lesson._id}`);
      
      if (!dryRun) {
        await RecordedLesson.updateOne(
          { _id: lesson._id },
          { $set: updates }
        );
      }
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} recorded lessons`);
  return updated;
}

/**
 * Main migration function
 */
async function migrateS3ToCloudFront(dryRun = true) {
  try {
    // Validate configuration
    if (!getCloudFrontBaseUrl()) {
      console.error(
        "❌ Error: Set CLOUDFRONT_URL or CDN_BASE_URL in .env (same as runtime uploads)."
      );
      console.log(
        "Example: CLOUDFRONT_URL=https://dxxxxxxxxxxxx.cloudfront.net"
      );
      process.exit(1);
    }

    console.log("=".repeat(60));
    console.log("🔄 S3 to CloudFront URL Migration");
    console.log("=".repeat(60));
    console.log(`S3 Bucket: ${S3_BUCKET_NAME}`);
    console.log(`CloudFront / CDN base: ${getCloudFrontBaseUrl()}`);
    console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE (will update database)"}`);
    console.log("=".repeat(60));

    // Connect to MongoDB
    console.log("\n📡 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Run migrations
    const results = {
      subcourses: await migrateSubcourses(dryRun),
      lessons: await migrateLessons(dryRun),
      courses: await migrateCourses(dryRun),
      promos: await migratePromos(dryRun),
      adminProfiles: await migrateAdminProfiles(dryRun),
      userProfiles: await migrateUserProfiles(dryRun),
      internshipLetters: await migrateInternshipLetters(dryRun),
      certificateTemplates: await migrateCertificateTemplates(dryRun),
      recordedLessons: await migrateRecordedLessons(dryRun),
    };

    // Summary
    const totalUpdated = Object.values(results).reduce((sum, count) => sum + count, 0);

    console.log("\n" + "=".repeat(60));
    console.log("📊 Migration Summary");
    console.log("=".repeat(60));
    console.log(`Subcourses:        ${results.subcourses}`);
    console.log(`Lessons:           ${results.lessons}`);
    console.log(`Courses:           ${results.courses}`);
    console.log(`Promos:            ${results.promos}`);
    console.log(`Admin Profiles:    ${results.adminProfiles}`);
    console.log(`User Profiles:     ${results.userProfiles}`);
    console.log(`Internship Letters: ${results.internshipLetters}`);
    console.log(`Cert Templates:    ${results.certificateTemplates}`);
    console.log(`Recorded Lessons:  ${results.recordedLessons}`);
    console.log("-".repeat(60));
    console.log(`Total Updated:     ${totalUpdated} documents`);
    console.log("=".repeat(60));

    if (dryRun) {
      console.log("\n⚠️  This was a DRY RUN. No changes were made.");
      console.log("To apply changes, run: node other_modules/migrateS3ToCloudFront.js --live");
    } else {
      console.log("\n✅ Migration completed successfully!");
    }

    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
const args = process.argv.slice(2);
const dryRun = !args.includes("--live");

migrateS3ToCloudFront(dryRun);
