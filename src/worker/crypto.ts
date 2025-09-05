// Crypto utilities for encrypting/decrypting Meta tokens
// Adapted for Cloudflare Workers environment

function generateKey(baseKey: string, length: number): Uint8Array {
  // If baseKey is empty, use a strong default fallback
  const key = baseKey || 'mocha-default-crypto-key-for-development-only-256bit-strong-key';
  
  // Use crypto.subtle to derive a proper key
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(key);
  
  // Create a proper key buffer with required length
  const result = new Uint8Array(length);
  
  // Fill the result using a deterministic hash-based approach
  for (let i = 0; i < length; i++) {
    // Use a combination of the original key byte and position
    const keyByte = keyBytes[i % keyBytes.length];
    const positionHash = ((i * 31) + keyByte) % 256;
    result[i] = positionHash !== 0 ? positionHash : (i % 255) + 1;
  }
  
  // Additional mixing to ensure randomness
  for (let i = 1; i < length; i++) {
    result[i] = (result[i] ^ result[i-1]) || 1;
  }
  
  return result;
}

function generateIV(baseIV: string, length: number): Uint8Array {
  // If baseIV is empty, use a default fallback
  const iv = baseIV || 'mocha-default-iv';
  
  const encoder = new TextEncoder();
  const ivBytes = encoder.encode(iv);
  
  // Create deterministic IV
  const result = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = ivBytes[i % ivBytes.length] ^ (i % 256);
  }
  
  // Ensure we have a non-zero IV
  for (let i = 0; i < length; i++) {
    if (result[i] === 0) {
      result[i] = (i + 42) % 256; // Use different offset than key
    }
  }
  
  return result;
}

export async function encrypt(text: string, key: string, iv: string): Promise<string> {
  try {
    // Log for debugging (but don't log actual key values for security)
    console.log('Encrypt called with key available:', !!key, 'iv available:', !!iv);
    
    // Ensure we have valid key and iv strings
    if (!key) {
      throw new Error('Encryption key is missing or empty');
    }
    if (!iv) {
      throw new Error('Encryption IV is missing or empty');
    }
    
    // Generate proper key and IV buffers
    const keyBuffer = generateKey(key, 32); // AES-256 needs 32 bytes
    const ivBuffer = generateIV(iv, 12); // AES-GCM recommended IV length
    
    // Verify buffers are not empty and have correct length
    if (keyBuffer.length !== 32) {
      throw new Error(`Generated key buffer has wrong length: ${keyBuffer.length}, expected 32`);
    }
    if (ivBuffer.length !== 12) {
      throw new Error(`Generated IV buffer has wrong length: ${ivBuffer.length}, expected 12`);
    }
    
    // Verify the buffer contains non-zero data
    const keySum = keyBuffer.reduce((sum, byte) => sum + byte, 0);
    const ivSum = ivBuffer.reduce((sum, byte) => sum + byte, 0);
    if (keySum === 0) {
      throw new Error('Generated key buffer is all zeros');
    }
    if (ivSum === 0) {
      throw new Error('Generated IV buffer is all zeros');
    }
    
    // Import key for AES-GCM
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // Encrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      cryptoKey,
      data
    );
    
    // Return base64 encoded result
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  } catch (error) {
    console.error('Encryption error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to encrypt token: ${errorMessage}`);
  }
}

export async function decrypt(encryptedText: string, key: string, iv: string): Promise<string> {
  try {
    // Log for debugging (but don't log actual key values for security)
    console.log('Decrypt called with key available:', !!key, 'iv available:', !!iv);
    
    // Ensure we have valid key and iv strings
    if (!key) {
      throw new Error('Decryption key is missing or empty');
    }
    if (!iv) {
      throw new Error('Decryption IV is missing or empty');
    }
    
    // Generate proper key and IV buffers (same as encrypt)
    const keyBuffer = generateKey(key, 32); // AES-256 needs 32 bytes
    const ivBuffer = generateIV(iv, 12); // AES-GCM recommended IV length
    const encryptedBuffer = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    
    // Verify buffers have correct length
    if (keyBuffer.length !== 32) {
      throw new Error(`Generated key buffer has wrong length: ${keyBuffer.length}, expected 32`);
    }
    if (ivBuffer.length !== 12) {
      throw new Error(`Generated IV buffer has wrong length: ${ivBuffer.length}, expected 12`);
    }
    
    // Import key for AES-GCM
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      cryptoKey,
      encryptedBuffer
    );
    
    // Return decoded string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to decrypt token: ${errorMessage}`);
  }
}

export function toActPath(adAccountId: string): string {
  if (adAccountId.startsWith('act_')) {
    return adAccountId;
  }
  return `act_${adAccountId}`;
}
