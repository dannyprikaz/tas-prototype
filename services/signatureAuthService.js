import { getCert } from "./certService";
import elliptic from "elliptic";
import { createHash } from "react-native-quick-crypto";
import { Buffer } from 'buffer';

export const extractPublicKeyFromPEM = (base64Pem) => {
  const pem = atob(base64Pem);
  const b64 = pem
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\s+/g, '');

  const der = Buffer.from(b64, 'base64');

  // Scan for a valid EC uncompressed public key: starts with 0x04 and is 65 bytes
  for (let i = 0; i <= der.length - 65; i++) {
    if (der[i] === 0x04) {
      const candidate = der.slice(i, i + 65); // 65 bytes = uncompressed EC point

      try {
        // Will throw if invalid
        const key = ec.keyFromPublic(candidate, 'hex');
        const pubPoint = key.getPublic();

        // Optional: ensure point lies on curve
        if (!pubPoint.validate()) {
          continue;
        }

        return candidate.toString('hex');
      } catch (e) {
        continue; // Not a valid EC public key
      }
    }
  }

  throw new Error('Unable to find valid EC public key in certificate');
};

const base45Charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

export function customBase45Decode(input) {
  const charset = base45Charset.split('');
  const charMap = Object.fromEntries(charset.map((c, i) => [c, i]));

  const bytes = [];
  let i = 0;

  while (i < input.length) {
    if (i + 2 < input.length) {
      const x = charMap[input[i]] * 45 * 45 +
                charMap[input[i + 1]] * 45 +
                charMap[input[i + 2]];
      bytes.push((x >> 8) & 0xff);
      bytes.push(x & 0xff);
      i += 3;
    } else if (i + 1 < input.length) {
      const x = charMap[input[i]] * 45 + charMap[input[i + 1]];
      bytes.push(x & 0xff);
      i += 2;
    } else {
      throw new Error("Invalid base45 input length");
    }
  }

  return Uint8Array.from(bytes);
}

function parseRawSignature(sig) {
  if (sig.length !== 64) throw new Error("Invalid raw signature length");
  const r = sig.slice(0, 32).toString('hex');
  const s = sig.slice(32).toString('hex');
  return { r, s };
}


const ec = new elliptic.ec("p256");

export const authenticateSignature = async (rawSignatureArray) => {
    try {
    console.log('Called authenticateSignature');
  const parsed = parseSignature(rawSignatureArray);
  const cert = await getCert(parsed.U.message); // U.message is the cert ID

  if (!cert || !cert.certificate) {
    throw new Error("Certificate not found or invalid.");
  }

  // Decode PEM certificate to extract public key
  const publicKey = extractPublicKeyFromPEM(cert.certificate);
  console.log(`publicKey: ${publicKey}`);
  const key = ec.keyFromPublic(publicKey, "hex");

  const time = parsed.T.message;

  // Compose signed messages
  const messages = {
    T: parsed.T.message,
    U: parsed.U.message + time,
    C: parsed.C.message + time,
    L: parsed.L.message + time,
  };

  // Verify each signature
  for (const prefix of ["T", "U", "C", "L"]) {
    console.log(`Verifying ${prefix}`);
    const signatureBytes = Buffer.from(customBase45Decode(parsed[prefix].signature));

    
    const sigObject = parseRawSignature(signatureBytes);

    const msgHash = createHash("sha256").update(messages[prefix]).digest();
    const isValid = key.verify(msgHash, sigObject);
    if (!isValid) {
      console.log(`Invalid signature for ${prefix}`);
      console.log(`Message (${prefix}):`, messages[prefix]);
      console.log(`Hash (${prefix}):`, msgHash.toString('hex'));
      console.log(`${prefix} Base45-encoded signature:`, parsed[prefix].signature);
      console.log(`${prefix} Decoded signature length:`, signatureBytes.length);
      console.log(`Signature (${prefix}):`, sigObject);
      return false;
    } else {
        console.log(`Verified ${prefix}`);
    }
  }

  return true;
    } catch (err) {
    console.error('Error in authenticateSignature:', err);
    throw err;
  }
};

export const parseSignature = (rawArray) => {
  const parsed = {
    T: { message: 'Unknown', signature: 'Unknown' },
    U: { message: 'Unknown', signature: 'Unknown' },
    L: { message: 'Unknown', signature: 'Unknown' },
    C: { message: 'Unknown', signature: 'Unknown' },
  };

  rawArray.forEach((item) => {
    const firstColon = item.indexOf(':');
    const secondColon = item.indexOf(':', firstColon + 1);

    if (firstColon === -1 || secondColon === -1) {
      console.warn("Malformed QR item (missing colons):", item);
      return;
    }

    const prefix = item.slice(0, firstColon);
    const message = item.slice(firstColon + 1, secondColon);
    const signature = item.slice(secondColon + 1);

    if (parsed[prefix]) {
      parsed[prefix] = { message, signature };
    } else {
      console.warn("Unknown prefix in QR data:", prefix);
    }
  });

  return parsed;
};
