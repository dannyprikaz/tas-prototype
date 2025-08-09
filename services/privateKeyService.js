import * as FileSystem from 'expo-file-system';
import { ec as EC } from 'elliptic';

const ec = new EC('p256'); // P-256 curve

const KEYS_DIR = FileSystem.documentDirectory + 'keys/';

async function ensureKeysDir() {
  const dirInfo = await FileSystem.getInfoAsync(KEYS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(KEYS_DIR, { intermediates: true });
  }
}

// Generate a new private key (returns hex strings)
export async function generatePrivateKey() {
  const keyPair = ec.genKeyPair();
  return {
    privateKeyHex: keyPair.getPrivate('hex'),
    publicKeyHex: keyPair.getPublic('hex'),
  };
}

// Save private key hex string to file named with cert_id
export async function savePrivateKey(certId, privateKeyHex) {
  await ensureKeysDir();
  const filePath = `${KEYS_DIR}${certId}.key`;
  await FileSystem.writeAsStringAsync(filePath, privateKeyHex, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return filePath;
}

// Load private key hex string by cert_id
export async function loadPrivateKey(certId) {
  const filePath = `${KEYS_DIR}${certId}.key`;
  const info = await FileSystem.getInfoAsync(filePath);
  if (!info.exists) {
    return null;
  }
  return await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

// Check if key exists for cert_id
export async function hasPrivateKey(certId) {
  const filePath = `${KEYS_DIR}${certId}.key`;
  const info = await FileSystem.getInfoAsync(filePath);
  return info.exists;
}
