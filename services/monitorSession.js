function extractClientIP(req, res, next) {
    // If you're behind a trusted proxy, ensure you have: app.set('trust proxy', true);
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      // x-forwarded-for can be a comma-separated list of IPs
      // The left-most is the original client.
      return xForwardedFor.split(',')[0].trim();
    }
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
}

function checkPayloadSizeAndAnomalies(req, maxAllowedSize = 200000) {
    // Convert the body to a string for naive checks
    const bodyString = JSON.stringify(req.body || {});
    const size = Buffer.byteLength(bodyString, 'utf8');
  
    // Check if the payload size exceeds your threshold
    const tooLarge = size > maxAllowedSize;
  
    // Very naive checks for suspicious patterns
    // (In real scenarios, use better heuristics or dedicated libraries)
    const suspiciousPatterns = /(\bUNION\b|\bSELECT\b|\<script\b|\bDROP\b|\binsert\b|\bUPDATE\b)/i.test(
      bodyString
    );
  
    return {
      tooLarge,
      suspiciousPatterns,
      size
    };
  }



  function getDistinctEndpointsAccessed(ip, path) {
    if (!endpointsAccessLog[ip]) {
      endpointsAccessLog[ip] = new Set();
    }
    endpointsAccessLog[ip].add(path);
  
    return endpointsAccessLog[ip].size;
  }

  const knownMaliciousAgents = [
    'sqlmap',        // SQL injection tool
    'nessus',        // Vulnerability scanner
    'masscan',       // Port scanner
    'nmap',          // Another port scanner
    'crawler-bot',   // Just an example
    'python-requests'
  ];
  
  /**
   * Checks if the user agent matches a known malicious signature.
   *
   * @param {string} userAgent - The raw user agent string
   * @return {boolean} - True if matches known malicious patterns
   */
  function isKnownMaliciousUserAgent(userAgent = '') {
    const lowerUA = userAgent.toLowerCase();
    return knownMaliciousAgents.some((agent) => lowerUA.includes(agent));
  }

  function isHuman(req) {
    const userAgent = req.headers['user-agent'] || '';
    // Basic check for presence of major browser strings
    const knownBrowsers = ['chrome', 'firefox', 'safari', 'edge', 'opera'];
    const lowerUA = userAgent.toLowerCase();
  
    return knownBrowsers.some((browser) => lowerUA.includes(browser));
  }

  // In-memory store: { [ip]: [ array of timestamps ] }
const requestTimestamps = {};

/**
 * Records the current request's timestamp for an IP
 * and returns the requests per minute for that IP.
 *
 * @param {string} ip - Client IP address
 * @param {number} timeWindowMs - Time window in milliseconds (e.g. 60000 for 1 min)
 * @return {number} - Approx requests per minute (or time window)
 */
function calculateRequestRate(ip, timeWindowMs = 60000) {
  const now = Date.now();

  if (!requestTimestamps[ip]) {
    requestTimestamps[ip] = [];
  }

  // Push current timestamp
  requestTimestamps[ip].push(now);

  // Prune timestamps older than timeWindowMs
  const cutoff = now - timeWindowMs;
  requestTimestamps[ip] = requestTimestamps[ip].filter((ts) => ts > cutoff);

  // Return how many remain in the window
  const requestsInWindow = requestTimestamps[ip].length;

  // If we want "requests per minute," we could scale it:
  // requestsInWindow / (timeWindowMs / 60000)
  return requestsInWindow;
}

// In-memory store: { [ipOrUserId]: number of fails }
const failedAuthCount = {};

/**
 * Increment the count of failed auth attempts for a given IP or user.
 *
 * @param {string} ipOrUserId
 */
function incrementFailedAuth(ipOrUserId) {
  if (!failedAuthCount[ipOrUserId]) {
    failedAuthCount[ipOrUserId] = 0;
  }
  failedAuthCount[ipOrUserId] += 1;
}

/**
 * Get the count of failed auth attempts for a given IP or user.
 *
 * @param {string} ipOrUserId
 * @return {number} - The number of failed auth attempts
 */
function getFailedAuthCount(ipOrUserId) {
  return failedAuthCount[ipOrUserId] || 0;
}

/**
 * Resets the failed auth count to 0 (e.g., after successful login).
 *
 * @param {string} ipOrUserId
 */
function resetFailedAuthCount(ipOrUserId) {
  failedAuthCount[ipOrUserId] = 0;
}


module.exports = {
    extractClientIP,
    checkPayloadSizeAndAnomalies,
    getDistinctEndpointsAccessed,
    isKnownMaliciousUserAgent,
    isHuman,
    calculateRequestRate,
    incrementFailedAuth,
    getFailedAuthCount,
    resetFailedAuthCount
  };