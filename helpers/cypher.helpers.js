const crypto = require("crypto");

/* encode string: 
A to 4
B to 8
C to C
D to delta lowercase ( δ )
E to 3
F to phi lowercase ( φ )
G to G
H to H
I to 1
J to J
K to K
L to L
M to M
N to M
O to 0
P to sigma lowercase ( σ )
Q to Q
R to R
S to 5
T to 7
U to U
V to V
W to psi lowercase ( ψ )
X to X
Y to Y
Z to Z
*/

function encodeString(str) {
  let encoded = str.toUpperCase();
  encoded = encoded.replace(/A/g, "4");
  encoded = encoded.replace(/E/g, "3");
  encoded = encoded.replace(/S/g, "5");
  encoded = encoded.replace(/T/g, "7");
  encoded = encoded.replace(/O/g, "0");
  encoded = encoded.replace(/I/g, "1");
  encoded = encoded.replace(/P/g, "σ");
  encoded = encoded.replace(/F/g, "φ");
  encoded = encoded.replace(/W/g, "ψ");
  return encoded;
}

function decodeString(str) {
  let decoded = str.toUpperCase();
  decoded = decoded.replace(/4/g, "A");
  decoded = decoded.replace(/3/g, "E");
  decoded = decoded.replace(/5/g, "S");
  decoded = decoded.replace(/7/g, "T");
  decoded = decoded.replace(/0/g, "O");
  decoded = decoded.replace(/1/g, "I");
  decoded = decoded.replace(/σ/g, "P");
  decoded = decoded.replace(/φ/g, "F");
  decoded = decoded.replace(/ψ/g, "W");
  return decoded;
}

// encrypt string with secret and crypto module
function encryptString(str, secret) {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(secret),
    Buffer.from(secret)
  );
  let encrypted = cipher.update(str);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString("hex");
}

// decrypt string with secret and crypto module
function decryptString(str, secret) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(secret),
    Buffer.from(secret)
  );
  let decrypted = decipher.update(str, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = {
  encodeString,
  decodeString,
  encryptString,
  decryptString
};
