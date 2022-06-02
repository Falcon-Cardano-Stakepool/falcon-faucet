import * as dotenv from "dotenv";
import forge from "node-forge";
dotenv.config();
let dbSecretKey: forge.pki.rsa.PrivateKey;

// Decrypt "encrypted" data
const resDecrypt = (encrypted: string, iv: string, tag: string, encapsulation: string) => {

  const kdf1 = new forge.kem.kdf1(forge.md.sha1.create());
  const kem = forge.kem.rsa.create(kdf1);
  const key = kem.decrypt(dbSecretKey, encapsulation, 16);

  // decrypt some bytes
  const decipher = forge.cipher.createDecipher('AES-GCM', key);
  decipher.start({iv, tag: forge.util.createBuffer(tag)});
  decipher.update(forge.util.createBuffer(encrypted));
  const pass = decipher.finish();
  // pass is false if there was a failure (eg: authentication tag didn't match)
  if(pass) {
    return decipher.output.getBytes();
  } else {
    return "ERROR";
  }

}

// Generate key pair
const rsaKeys = () => {
  const keys = forge.pki.rsa.generateKeyPair({bits: 2048, workers: -1});
  return {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey
  }
}