const crypto = require('crypto');
const QRCode = require('qrcode');

function getSecret() {
  return process.env.QR_SECRET || 'pushkarpath-qr-secret-2027';
}

/**
 * Creates an HMAC-SHA256 signature for vehicle number and QR version
 */
function signPayload(vehicleNo, qrVersion) {
  const secret = getSecret();
  const data = `${vehicleNo}:${qrVersion}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Generates signed QR payload object
 */
function generateQRPayload(vehicleNo, qrVersion = 1) {
  const cleanVehicleNo = String(vehicleNo).trim().toUpperCase();
  const cleanVersion = Number(qrVersion) || 1;
  const sig = signPayload(cleanVehicleNo, cleanVersion);

  return {
    v: cleanVehicleNo,
    ver: cleanVersion,
    sig
  };
}

/**
 * Verifies QR payload HMAC signature and structure
 * Accepts either JSON string or object
 */
function verifyQRPayload(payload) {
  try {
    let parsed = payload;
    if (typeof payload === 'string') {
      try {
        parsed = JSON.parse(payload);
      } catch (err) {
        return { valid: false, reason: 'QR payload is not valid JSON' };
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, reason: 'Invalid QR payload format' };
    }

    const { v, ver, sig } = parsed;

    if (!v || typeof v !== 'string') {
      return { valid: false, reason: 'Missing or invalid vehicle number' };
    }

    if (typeof ver !== 'number' && typeof ver !== 'string') {
      return { valid: false, reason: 'Missing or invalid QR version' };
    }

    if (!sig || typeof sig !== 'string') {
      return { valid: false, reason: 'Missing QR signature' };
    }

    const cleanVehicleNo = String(v).trim().toUpperCase();
    const cleanVersion = Number(ver);
    const expectedSig = signPayload(cleanVehicleNo, cleanVersion);

    // Constant-time comparison
    const sigBuffer = Buffer.from(sig, 'hex');
    const expectedBuffer = Buffer.from(expectedSig, 'hex');

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, reason: 'Invalid or forged QR signature' };
    }

    return {
      valid: true,
      vehicleNo: cleanVehicleNo,
      qrVersion: cleanVersion
    };
  } catch (error) {
    return { valid: false, reason: `Verification error: ${error.message}` };
  }
}

/**
 * Generates a Data URL (base64 image) representing the signed QR code
 */
async function generateQRDataURL(vehicleNo, qrVersion = 1) {
  const payload = generateQRPayload(vehicleNo, qrVersion);
  const jsonString = JSON.stringify(payload);
  return await QRCode.toDataURL(jsonString, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
}

/**
 * Poster QR logic for On-Ground Check-in Points (IN and OUT)
 */
function signPoster(lotCode, point, version = 1) {
  const secret = getSecret();
  const cleanCode = String(lotCode).trim().toUpperCase();
  const cleanPoint = String(point).trim().toLowerCase();
  const data = `POSTER:${cleanCode}:${cleanPoint}:${version}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function generatePosterPayload(lotCode, point, version = 1) {
  const cleanCode = String(lotCode).trim().toUpperCase();
  const cleanPoint = String(point).trim().toLowerCase();
  const sig = signPoster(cleanCode, cleanPoint, version);
  return {
    type: 'poster',
    lotCode: cleanCode,
    point: cleanPoint,
    ver: version,
    sig
  };
}

function verifyPosterPayload(payload) {
  try {
    let parsed = payload;
    if (typeof payload === 'string') {
      try {
        parsed = JSON.parse(payload);
      } catch (err) {
        return { valid: false, reason: 'Poster payload is not valid JSON' };
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, reason: 'Invalid poster payload format' };
    }

    const { lotCode, point, ver = 1, sig } = parsed;
    if (!lotCode || !point || !sig) {
      return { valid: false, reason: 'Missing required poster fields (lotCode, point, sig)' };
    }

    const cleanCode = String(lotCode).trim().toUpperCase();
    const cleanPoint = String(point).trim().toLowerCase();
    const cleanVer = Number(ver);
    const expectedSig = signPoster(cleanCode, cleanPoint, cleanVer);

    const sigBuffer = Buffer.from(sig, 'hex');
    const expectedBuffer = Buffer.from(expectedSig, 'hex');

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, reason: 'Invalid or forged poster signature' };
    }

    return {
      valid: true,
      lotCode: cleanCode,
      point: cleanPoint,
      version: cleanVer
    };
  } catch (error) {
    return { valid: false, reason: `Poster verification error: ${error.message}` };
  }
}

async function generatePosterDataURL(lotCode, point, version = 1, checkinBaseUrl = '') {
  const payload = generatePosterPayload(lotCode, point, version);
  const qParam = encodeURIComponent(JSON.stringify(payload));
  // If base URL provided, encode link to checkin page: e.g. https://domain/checkin?q=...
  const content = checkinBaseUrl
    ? `${checkinBaseUrl.replace(/\/+$/, '')}/checkin?q=${qParam}`
    : JSON.stringify(payload);

  return await QRCode.toDataURL(content, {
    errorCorrectionLevel: 'H',
    margin: 3,
    width: 400,
    color: {
      dark: '#1e293b',
      light: '#ffffff'
    }
  });
}

module.exports = {
  generateQRPayload,
  verifyQRPayload,
  generateQRDataURL,
  signPoster,
  generatePosterPayload,
  verifyPosterPayload,
  generatePosterDataURL
};
