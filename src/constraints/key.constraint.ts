import * as crypto from 'crypto';

const wrap64 = (b64: string) => b64.match(/.{1,64}/g)?.join('\n') ?? b64;

export function pemToBase64(pem: string): string {
  return pem
    .replace(/-----BEGIN [\s\S]+?-----/g, '')
    .replace(/-----END [\s\S]+?-----/g, '')
    .replace(/\s+/g, '');
}

export function base64ToPem(
  b64: string,
  type: 'public' | 'private' | 'enc-private',
): string {
  if (type === 'public') {
    return `-----BEGIN PUBLIC KEY-----\n${wrap64(b64)}\n-----END PUBLIC KEY-----`;
  }
  if (type === 'enc-private') {
    return `-----BEGIN ENCRYPTED PRIVATE KEY-----\n${wrap64(b64)}\n-----END ENCRYPTED PRIVATE KEY-----`;
  }
  return `-----BEGIN PRIVATE KEY-----\n${wrap64(b64)}\n-----END PRIVATE KEY-----`;
}

/** Keypair runtime cho chat (KHÔNG passphrase) */
export function genKeyPairForChat(modulusLength = 2048) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, // no cipher, no passphrase
  });
  return { publicKeyPem: publicKey, privateKeyPem: privateKey };
}

/** Keypair backup có mã hóa bằng passphrase (PHỤC VỤ khôi phục khi mất khóa) */
export function genKeyPairWithPassphrase(
  passphrase: string,
  modulusLength = 2048,
) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase,
    },
  });

  // trả cả PEM & Base64 gọn
  return {
    publicKeyPem: publicKey,
    privateKeyPemEncrypted: privateKey, // -----BEGIN ENCRYPTED PRIVATE KEY-----
    publicKeyBase64: pemToBase64(publicKey),
    privateKeyBase64Encrypted: pemToBase64(privateKey),
  };
}

/** Xác minh passphrase mở được privateKey đã mã hóa (backup) */
export function verifyPrivateKeyPassphrase(
  passphrase: string,
  encPrivateKeyPem: string,
  publicKeyPem: string,
): boolean {
  try {
    const sample = Buffer.from('verify-test');
    const sig = crypto.sign('sha256', sample, {
      key: encPrivateKeyPem,
      passphrase,
    });
    return crypto.verify('sha256', sample, publicKeyPem, sig);
  } catch {
    return false;
  }
}
