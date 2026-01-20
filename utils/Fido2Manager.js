const { Fido2Lib } = require('fido2-lib');

const f2l = new Fido2Lib({
    timeout: 60000,
    rpId: 'localhost',     // In production, use your actual domain (without https://)
    rpName: 'Sudo Key Demo',
    challengeSize: 32,
    attestation: 'direct', // or 'none'
    cryptoParams: [-7, -257], // ES256, RS256
  });