const crypto = require('crypto');
const { apiResponse } = require('../../../utils/apiResponse');
const UserDeletionRequest = require('../../models/deletion/userDeletionRequest');
const {
  deleteUserAccountById,
  findUserIdByEmail,
} = require('../../services/deleteUserAccount');

function getBaseUrl(req) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, '');
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

function generateConfirmationCode() {
  return crypto.randomBytes(16).toString('hex');
}

function parseFacebookSignedRequest(signedRequest, appSecret) {
  if (!signedRequest || !appSecret) {
    throw new Error('Missing signed_request or FACEBOOK_APP_SECRET');
  }

  const parts = signedRequest.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid signed_request format');
  }

  const [encodedSig, payload] = parts;
  const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const expectedSig = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest();

  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(sig, expectedSig)) {
    throw new Error('Invalid signed_request signature');
  }

  const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  return JSON.parse(json);
}

function verifyCallbackSecret(req) {
  const secret = process.env.DATA_DELETION_CALLBACK_SECRET;
  if (!secret) return false;
  const provided =
    req.headers['x-deletion-callback-secret'] ||
    req.headers['x-data-deletion-secret'] ||
    req.body?.secret;
  return provided === secret;
}

async function processDeletionRequest({ userId, email, externalUserId, source }) {
  const confirmationCode = generateConfirmationCode();
  const record = await UserDeletionRequest.create({
    confirmationCode,
    userId: userId || undefined,
    email: email || undefined,
    externalUserId: externalUserId || undefined,
    source,
    status: 'pending',
  });

  let resolvedUserId = userId;
  if (!resolvedUserId && email) {
    resolvedUserId = await findUserIdByEmail(email);
  }

  if (!resolvedUserId) {
    record.status = 'not_found';
    record.message = 'No matching user account found';
    await record.save();
    return record;
  }

  try {
    const result = await deleteUserAccountById(resolvedUserId);
    if (result.deleted) {
      record.status = 'completed';
      record.userId = resolvedUserId;
      record.message = 'User account and associated data deleted';
    } else {
      record.status = result.reason === 'user_not_found' ? 'not_found' : 'failed';
      record.message = result.reason || 'Deletion failed';
    }
    await record.save();
    return record;
  } catch (error) {
    record.status = 'failed';
    record.message = error.message;
    await record.save();
    return record;
  }
}

/**
 * POST /api/user/data-deletion/callback
 * Meta: application/x-www-form-urlencoded { signed_request }
 * Generic: JSON { email } or { userId } + X-Deletion-Callback-Secret header
 */
exports.handleUserDeletionCallback = async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const facebookSecret = process.env.FACEBOOK_APP_SECRET;

    if (req.body?.signed_request && facebookSecret) {
      let parsed;
      try {
        parsed = parseFacebookSignedRequest(req.body.signed_request, facebookSecret);
      } catch (err) {
        return apiResponse(res, {
          success: false,
          message: `Invalid Facebook signed_request: ${err.message}`,
          statusCode: 400,
        });
      }

      const externalUserId = parsed.user_id ? String(parsed.user_id) : undefined;
      const record = await processDeletionRequest({
        externalUserId,
        source: 'meta',
      });

      const statusUrl = `${baseUrl}/api/user/data-deletion/status/${record.confirmationCode}`;
      return res.status(200).json({
        url: statusUrl,
        confirmation_code: record.confirmationCode,
      });
    }

    if (!verifyCallbackSecret(req)) {
      return apiResponse(res, {
        success: false,
        message: 'Unauthorized deletion callback',
        statusCode: 401,
      });
    }

    const { email, userId } = req.body || {};
    if (!email && !userId) {
      return apiResponse(res, {
        success: false,
        message: 'Provide email or userId in request body',
        statusCode: 400,
      });
    }

    const record = await processDeletionRequest({
      email,
      userId,
      source: 'api',
    });

    const statusUrl = `${baseUrl}/api/user/data-deletion/status/${record.confirmationCode}`;
    return apiResponse(res, {
      success: true,
      message: 'Deletion request processed',
      data: {
        url: statusUrl,
        confirmation_code: record.confirmationCode,
        status: record.status,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('[userDeletionCallback] Error:', error);
    return apiResponse(res, {
      success: false,
      message: `Deletion callback failed: ${error.message}`,
      statusCode: 500,
    });
  }
};

/**
 * GET /api/user/data-deletion/status/:confirmationCode
 * Public status page data for Meta / compliance links.
 */
exports.getUserDeletionStatus = async (req, res) => {
  try {
    const { confirmationCode } = req.params;
    if (!confirmationCode) {
      return apiResponse(res, {
        success: false,
        message: 'confirmationCode is required',
        statusCode: 400,
      });
    }

    const record = await UserDeletionRequest.findOne({ confirmationCode }).lean();
    if (!record) {
      return apiResponse(res, {
        success: false,
        message: 'Deletion request not found',
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Deletion request status',
      data: {
        confirmation_code: record.confirmationCode,
        status: record.status,
        message: record.message,
        requested_at: record.createdAt,
        updated_at: record.updatedAt,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('[userDeletionStatus] Error:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch deletion status: ${error.message}`,
      statusCode: 500,
    });
  }
};
