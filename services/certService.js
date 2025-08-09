import api from './api';
import * as asn1js from 'asn1js';
import { Buffer } from 'buffer';
import { ec as EC } from 'elliptic';
import { sha256 as sha256hash } from 'js-sha256';

const ec = new EC('p256');

// Recursively walk ASN.1 structure and log info
function logASN1(node, indent = 0) {
  const pad = " ".repeat(indent);
  const typeName = node.constructor.name;
  let info = "";

  if (node.idBlock && node.idBlock.tagNumber !== undefined) {
    info += `tagClass=${node.idBlock.tagClass} tagNumber=${node.idBlock.tagNumber} `;
  }

  if (node.valueBlock) {
    if (node.valueBlock.value) {
      if (Array.isArray(node.valueBlock.value)) {
        info += `(children: ${node.valueBlock.value.length})`;
      } else if (node.valueBlock.valueHex) {
        info += `(hexLen: ${node.valueBlock.valueHex.byteLength})`;
      }
    }
  }

  console.log(`${pad}${typeName} ${info}`);

  if (node.valueBlock && node.valueBlock.value) {
    if (Array.isArray(node.valueBlock.value)) {
      node.valueBlock.value.forEach((child) => logASN1(child, indent + 2));
    }
  }
}

// Use it to parse and log your CSR buffer:
export function logCSRStructure(csrDERBuffer) {
  const asn1 = asn1js.fromBER(csrDERBuffer.buffer || csrDERBuffer);
  if (asn1.offset === -1) {
    console.error("Failed to parse CSR DER");
    return;
  }
  console.log("ASN.1 CSR Structure:");
  logASN1(asn1.result);
}

function derToPem(derBuffer, label) {
  const base64 = Buffer.from(derBuffer).toString('base64');
  const chunks = base64.match(/.{1,64}/g);
  return `-----BEGIN ${label}-----\n${chunks.join('\n')}\n-----END ${label}-----\n`;
}

// Correct createSubject function to build full Name structure with RDN SET and CN OID + UTF8String
function createSubject(userId) {
  return new asn1js.Sequence({
    value: [
      // RelativeDistinguishedName (RDN) = SET of AttributeTypeAndValue SEQUENCE
      new asn1js.Set({
        value: [
          new asn1js.Sequence({
            value: [
              // OID for commonName
              new asn1js.ObjectIdentifier({ value: '2.5.4.3' }),
              // UTF8String for CN value
              new asn1js.Utf8String({ value: userId }),
            ],
          }),
        ],
      }),
    ],
  });
}

// SHA256 hash helper
async function sha256(data) {
  if (Buffer.isBuffer(data)) {
    data = new Uint8Array(data);
  }
  const hashArray = sha256hash.arrayBuffer(data);
  return Buffer.from(hashArray);
}

export async function createCSR(userId, email, privateKeyHex) {
  // Public key bytes in uncompressed form (0x04 + X + Y)
  const ecPublicKeyHex = ec.keyFromPrivate(privateKeyHex).getPublic('hex');
  const publicKeyBytes = Buffer.from(ecPublicKeyHex, 'hex');

  // AlgorithmIdentifier for EC P-256
  const algorithmIdentifier = new asn1js.Sequence({
    value: [
      new asn1js.ObjectIdentifier({ value: '1.2.840.10045.2.1' }), // id-ecPublicKey
      new asn1js.ObjectIdentifier({ value: '1.2.840.10045.3.1.7' }), // prime256v1 (P-256)
    ],
  });

  const subjectPublicKeyInfo = new asn1js.Sequence({
    value: [
      algorithmIdentifier,
      new asn1js.BitString({ valueHex: publicKeyBytes.buffer }),
    ],
  });

  // Build subject with correct RDN structure
  const subject = createSubject(userId);

  // Build subjectAltName extension:

  // GeneralName for rfc822Name = [1] context-specific with IA5String email
  const generalName = new asn1js.Primitive({
    idBlock: { tagClass: 3, tagNumber: 1 }, // [1] context-specific for rfc822Name
    valueHex: Buffer.from(email, 'ascii').buffer,
  });

  // Wrap GeneralName in a sequence (GeneralNames)
  const generalNames = new asn1js.Sequence({
    value: [generalName],
  });

  // OCTET STRING wrapping GeneralNames DER for extension value
  const subjectAltNameExtensionValue = new asn1js.OctetString({
    valueHex: generalNames.toBER(false),
  });

  // Build extension sequence: OID + OCTET STRING
  const extensionSequence = new asn1js.Sequence({
    value: [
      new asn1js.ObjectIdentifier({ value: '2.5.29.17' }), // subjectAltName OID
      subjectAltNameExtensionValue,
    ],
  });

  // Build extensionRequest attribute (OID + Set of extensions)
  const extensionRequestAttr = new asn1js.Sequence({
    value: [
      new asn1js.ObjectIdentifier({ value: '1.2.840.113549.1.9.14' }), // extensionRequest OID
      new asn1js.Set({
        value: [
          new asn1js.Sequence({
            value: [extensionSequence],
          }),
        ],
      }),
    ],
  });

  // Attributes SET OF Attribute
  const attributes = new asn1js.Set({
    value: [extensionRequestAttr],
  });

  // CertificationRequestInfo ::= SEQUENCE {
  //   version       INTEGER { v1(0) },
  //   subject       Name,
  //   subjectPKInfo SubjectPublicKeyInfo,
  //   attributes    [0] IMPLICIT SET OF Attribute
  // }

  const certificationRequestInfo = new asn1js.Sequence({
    value: [
      new asn1js.Integer({ value: 0 }), // version = 0
      subject,
      subjectPublicKeyInfo,
      new asn1js.Constructed({
        idBlock: { tagClass: 3, tagNumber: 0 }, // [0] context-specific IMPLICIT
        value: attributes.valueBlock.value, // Use the SET's values directly
      }),
    ],
  });

  const criBuffer = certificationRequestInfo.toBER(false);

  // Sign CertificationRequestInfo using elliptic and SHA-256
  const hashBuffer = await sha256(criBuffer);

  const key = ec.keyFromPrivate(privateKeyHex, 'hex');
  const signature = key.sign(Buffer.from(hashBuffer));

  const derSignature = Buffer.from(signature.toDER());

  // SignatureAlgorithm SEQUENCE for ecdsa-with-SHA256
  const signatureAlgorithm = new asn1js.Sequence({
    value: [
      new asn1js.ObjectIdentifier({ value: '1.2.840.10045.4.3.2' }), // ecdsa-with-SHA256
      new asn1js.Null(),
    ],
  });

  // Full CertificationRequest SEQUENCE - FIXED: Don't use RawData wrapper
  const certificationRequest = new asn1js.Sequence({
    value: [
      certificationRequestInfo, // Direct inclusion, not wrapped in RawData
      signatureAlgorithm,
      new asn1js.BitString({ valueHex: derSignature.buffer }),
    ],
  });

  const csrDER = certificationRequest.toBER(false);

  logCSRStructure(csrDER);

  return derToPem(csrDER, 'CERTIFICATE REQUEST');
}

export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createUserId() {
  return generateUUID();
}

export async function submitCSR(userId, csr, nameOfUser) {
  const csrBase64 = Buffer.from(csr).toString('base64');

  const response = await api.post(`/users/${userId}/certificates`, {
    name: nameOfUser,
    csr: csrBase64,
  });

  return response.data;
}

export async function getCert(id) {
  const response = await api.get(`/certificates/${id}`);
  return response.data;
}

export async function checkCert(certId) {
  const response = await api.get(`/certificates/${certId}`);
  return response.status === 200;
}