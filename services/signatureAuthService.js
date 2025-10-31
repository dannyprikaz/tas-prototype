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
    console.log('Called authenticateSignature with fragment-based verification');
    
    // Parse all 4 QR codes
    const parsed = parseSignatureFragments(rawSignatureArray);
    
    // Verify we have all 4 fragments
    if (!parsed.T || !parsed.I || !parsed.C || !parsed.L) {
      throw new Error("Missing one or more QR codes (T, I, C, L required)");
    }
    
    // Get certificate using Identity cert ID
    const cert = await getCert(parsed.I.data);
    
    if (!cert || !cert.certificate) {
      throw new Error("Certificate not found or invalid.");
    }

    // Extract public key from certificate
    const publicKey = extractPublicKeyFromPEM(cert.certificate);
    console.log(`Public Key: ${publicKey}`);
    const key = ec.keyFromPublic(publicKey, "hex");

    // Reconstruct the full signature from 4 fragments
    const fullSignatureBase45 = 
      parsed.T.signatureFragment +
      parsed.I.signatureFragment +
      parsed.C.signatureFragment +
      parsed.L.signatureFragment;
    
    console.log(`Reconstructed signature (Base45): ${fullSignatureBase45}`);
    console.log(`Signature length: ${fullSignatureBase45.length} chars`);
    
    // Decode the full signature
    const signatureBytes = Buffer.from(customBase45Decode(fullSignatureBase45));
    console.log(`Decoded signature length: ${signatureBytes.length} bytes`);
    
    if (signatureBytes.length !== 64) {
      throw new Error(`Invalid signature length: ${signatureBytes.length} bytes (expected 64)`);
    }
    
    const sigObject = parseRawSignature(signatureBytes);

    // Compose the message that was signed (all 4 data pieces concatenated)
    const compositeMessage = parsed.T.data + parsed.I.data + parsed.C.data + parsed.L.data;
    console.log(`Composite message: ${compositeMessage}`);
    
    // Hash the composite message
    const msgHash = createHash("sha256").update(compositeMessage).digest();
    console.log(`Message hash: ${msgHash.toString('hex')}`);
    
    // Verify the signature
    const isValid = key.verify(msgHash, sigObject);
    
    if (!isValid) {
      console.log('❌ Signature verification failed');
      console.log('Debug info:');
      console.log('- T data:', parsed.T.data);
      console.log('- I data:', parsed.I.data);
      console.log('- C data:', parsed.C.data);
      console.log('- L data:', parsed.L.data);
      console.log('- Signature object:', sigObject);
      return false;
    }
    
    console.log('✅ Signature verified successfully');
    return true;
    
  } catch (err) {
    console.error('Error in authenticateSignature:', err);
    throw err;
  }
};

/**
 * Parse QR codes with signature fragments
 * New format (no delimiters):
 * - T{timestamp}{fragment}          e.g., T1709654400ABCD...
 * - I{certID}{fragment}             e.g., IC9HV8RN9P0H0001EFGH...
 * - C{contentID}{fragment}          e.g., CC9HV8RN9P0H0002IJKL...
 * - L{len}{geohash}{fragment}       e.g., L69Q5CTRMNOP...
 */
export const parseSignatureFragments = (rawArray) => {
  const parsed = {
    T: null,
    I: null,
    C: null,
    L: null,
  };

  rawArray.forEach((item) => {
    if (!item || item.length < 2) {
      console.warn("Malformed QR item (too short):", item);
      return;
    }

    const prefix = item[0];

    try {
      switch (prefix) {
        case 'T': {
          // T{timestamp}{fragment}
          // Timestamp is always 10 digits
          const data = item.substring(1, 11);
          const signatureFragment = item.substring(11);
          
          parsed.T = { data, signatureFragment };
          console.log(`Parsed T: timestamp=${data}, fragment length=${signatureFragment.length}`);
          break;
        }
        
        case 'I': {
          // I{certID}{fragment}
          // Cert ID (XID) is always 20 characters
          const data = item.substring(1, 21);
          const signatureFragment = item.substring(21);
          
          parsed.I = { data, signatureFragment };
          console.log(`Parsed I: certID=${data}, fragment length=${signatureFragment.length}`);
          break;
        }
        
        case 'C': {
          // C{contentID}{fragment}
          // Content ID (XID) is always 20 characters
          const data = item.substring(1, 21);
          const signatureFragment = item.substring(21);
          
          parsed.C = { data, signatureFragment };
          console.log(`Parsed C: contentID=${data}, fragment length=${signatureFragment.length}`);
          break;
        }
        
        case 'L': {
          // L{len}{geohash}{fragment}
          // Length indicator is 1 digit (1-8)
          const geohashLength = parseInt(item[1], 10);
          
          if (isNaN(geohashLength) || geohashLength < 1 || geohashLength > 8) {
            throw new Error(`Invalid geohash length: ${item[1]}`);
          }
          
          const data = item.substring(2, 2 + geohashLength);
          const signatureFragment = item.substring(2 + geohashLength);
          
          parsed.L = { data, signatureFragment, geohashLength };
          console.log(`Parsed L: geohash=${data} (length=${geohashLength}), fragment length=${signatureFragment.length}`);
          break;
        }
        
        default:
          console.warn("Unknown prefix in QR data:", prefix);
      }
    } catch (err) {
      console.error(`Error parsing QR code with prefix ${prefix}:`, err);
    }
  });

  return parsed;
};

/**
 * Legacy parser for old format with colons (for backward compatibility)
 * Old format: T:1709654400:MEUCIQD+7...
 */
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