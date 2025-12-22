/* eslint-disable @typescript-eslint/no-unused-vars */
import * as CryptoJS from 'crypto-js';
import * as fs from 'fs';
import * as crypto from 'node:crypto';
import * as path from 'node:path';
import { JSEncrypt } from 'jsencrypt';
import * as forge from 'node-forge';

function checkExistFolder(name: string) {
  const checkPath = path.join(process.cwd(), name);
  if (!fs.existsSync(checkPath)) {
    fs.mkdirSync(checkPath, { recursive: true });
  }
}

export const encryptWithPublicKeyForge = (
  publicKeyPem: string,
  data: string,
) => {
  const publicKey = forge.pki.publicKeyFromPem(
    `-----BEGIN PUBLIC KEY-----\n${publicKeyPem}\n-----END PUBLIC KEY-----`,
  );

  const encrypted = publicKey.encrypt(data, 'RSAES-PKCS1-V1_5');

  return forge.util.encode64(encrypted);
};

export function decryptWithPrivateKeyForge(
  privateKeyBase64: string,
  encrypted: string,
): string {
  const pem = `-----BEGIN RSA PRIVATE KEY-----\n${privateKeyBase64}\n-----END RSA PRIVATE KEY-----`;
  const privateKey = forge.pki.privateKeyFromPem(pem);

  const encryptedBytes = forge.util.decode64(encrypted);

  return privateKey.decrypt(encryptedBytes, 'RSAES-PKCS1-V1_5');
}

export function encryptWithPublicKey(publicKey: string, data: string): string {
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(
    `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`,
  );
  return encryptor.encrypt(data) || '';
}

export function encryptWithPublicKeyBe(
  publicKey: string,
  data: string,
): string {
  const pem = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
  const buffer = Buffer.from(data, 'utf8');
  const encrypted = crypto.publicEncrypt(
    {
      key: pem,
      padding: crypto.constants.RSA_PKCS1_PADDING, // để tương thích với jsencrypt
    },
    buffer,
  );
  return encrypted.toString('base64');
}

export function decryptWithPrivateKey(
  privateKey: string,
  encryptedData: string,
): string {
  const decryptor = new JSEncrypt();
  decryptor.setPrivateKey(
    `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`,
  );
  return decryptor.decrypt(encryptedData) || '';
}

export function decryptWithPrivateKeyBe(
  privateKey: string,
  encryptedData: string,
): string {
  const pem = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
  const buffer = Buffer.from(encryptedData, 'base64');
  const decrypted = crypto.privateDecrypt(
    {
      key: pem,
      padding: crypto.constants.RSA_PKCS1_PADDING, // tương thích với jsencrypt
    },
    buffer,
  );
  return decrypted.toString('utf8');
}

function generateKeyPair(tokenType: string): {
  privateKey: string;
  publicKey: string;
} {
  checkExistFolder('secure');

  const privateKeyPath = path.join(
    process.cwd(),
    `secure/${tokenType}_private.key`,
  );
  const publicKeyPath = path.join(
    process.cwd(),
    `secure/${tokenType}_public.key`,
  );

  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    fs.writeFileSync(privateKeyPath, privateKey);
    fs.writeFileSync(publicKeyPath, publicKey);
  }

  const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
  const publicKey = fs.readFileSync(publicKeyPath, 'utf-8');

  return { privateKey, publicKey };
}

export const {
  privateKey: ACCESS_TOKEN_PRIVATE_KEY,
  publicKey: ACCESS_TOKEN_PUBLIC_KEY,
} = generateKeyPair('access_token');

export const {
  privateKey: REFRESH_TOKEN_PRIVATE_KEY,
  publicKey: REFRESH_TOKEN_PUBLIC_KEY,
} = generateKeyPair('refresh_token');

export function genKeyPairRSA() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const publicKeyBase64 = publicKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');

  const privateKeyBase64 = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');

  return { privatekey: privateKeyBase64, publickey: publicKeyBase64 };
}

export function encrypt(
  text: string,
  passphrase: string,
): { iv: string; salt: string; data: string } {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);

  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    data: Buffer.concat([encrypted, tag]).toString('hex'),
  };
}

export function decrypt(
  encrypted: { iv: string; salt: string; data: string },
  passphrase: string,
): string {
  const salt = Buffer.from(encrypted.salt, 'hex');
  const iv = Buffer.from(encrypted.iv, 'hex');
  const data = Buffer.from(encrypted.data, 'hex');

  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  const tag = data.subarray(data.length - 16);
  const text = data.subarray(0, data.length - 16);

  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(text), decipher.final()]);
  return decrypted.toString('utf8');
}

export function encryptCrossPlatform(text: string, passphrase: string): string {
  return CryptoJS.AES.encrypt(text, passphrase).toString();
}

export function decryptCrossPlatform(
  ciphertext: string,
  passphrase: string,
): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, passphrase);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function wrapPrivateKey(base64: string): string {
  return `-----BEGIN PRIVATE KEY-----\n${base64.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;
}

export function wrapPublicKey(base64: string): string {
  return `-----BEGIN PUBLIC KEY-----\n${base64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
}

export function verifyPassphrase(
  encryptedPrivateKey: string,
  passphrase: string,
): boolean {
  try {
    const decrypted = decryptCrossPlatform(encryptedPrivateKey, passphrase);

    if (!decrypted) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

export function genKeyPairRSAWith(passphrase: string) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: passphrase,
    },
  });

  // encode base64 nếu muốn lưu gọn
  const publicKeyBase64 = publicKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');

  const privateKeyBase64 = privateKey
    .replace('-----BEGIN ENCRYPTED PRIVATE KEY-----', '')
    .replace('-----END ENCRYPTED PRIVATE KEY-----', '')
    .replace(/\s+/g, '');

  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    publicKeyBase64,
    privateKeyBase64,
  };
}

export function verifyPrivateKey(
  passphrase: string,
  privateKeyBase64: string,
  publicKeyBase64: string,
): boolean {
  const privateKeyPem = toPem(privateKeyBase64, 'private');
  const publicKeyPem = toPem(publicKeyBase64, 'public');

  try {
    const testData = Buffer.from('verify-test-data');

    const signature = crypto.sign('sha256', testData, {
      key: privateKeyPem,
      passphrase: passphrase,
    });

    const isValid = crypto.verify('sha256', testData, publicKeyPem, signature);

    return isValid;
  } catch (err) {
    return false;
  }
}

function toPem(base64Key: string, type: 'public' | 'private'): string {
  if (type === 'public') {
    return `-----BEGIN PUBLIC KEY-----\n${base64Key.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
  } else {
    return `-----BEGIN ENCRYPTED PRIVATE KEY-----\n${base64Key.match(/.{1,64}/g)?.join('\n')}\n-----END ENCRYPTED PRIVATE KEY-----`;
  }
}
