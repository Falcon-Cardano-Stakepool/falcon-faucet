import * as bip39 from "bip39";
import * as CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";

export function toHexString(byteArray: Uint8Array) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}

export function harden(num: number) {
  return 0x80000000 + num;
}

export const toHex=(bytes)=>Buffer.from(bytes).toString("hex");
export const fromHex=(hex)=>Buffer.from(hex,"hex");

// Key Derivation
export const deriveRootKey = (mnemonicStr: string): CardanoWasm.Bip32PrivateKey =>{
  if (!bip39.validateMnemonic(mnemonicStr))
      throw new Error ("Mnemonic is not valid.");
  const entropy = bip39.mnemonicToEntropy(mnemonicStr); 
  return CardanoWasm.Bip32PrivateKey.from_bip39_entropy(Buffer.from(entropy, "hex"), Buffer.from(""));
}

export const deriveAccountKey = (rootKey: CardanoWasm.Bip32PrivateKey, index: number): CardanoWasm.Bip32PrivateKey =>
  rootKey
      .derive(harden(1852)) // CIP1852
      .derive(harden(1815))
      .derive(harden(index));

export const deriveSpendPrivateKey = (accountKey: CardanoWasm.Bip32PrivateKey, index: number): CardanoWasm.Bip32PrivateKey =>
  accountKey
      .derive(0) // External
      .derive(index);

export const deriveChangePrivateKey = (accountKey: CardanoWasm.Bip32PrivateKey, index: number): CardanoWasm.Bip32PrivateKey =>
  accountKey
      .derive(1) // Change (Internal)
      .derive(index);

export const deriveStakePrivateKey = (accountKey: CardanoWasm.Bip32PrivateKey, index: number): CardanoWasm.Bip32PrivateKey =>
  accountKey
      .derive(2) // Chimeric
      .derive(index)


export const deriveSpendPublicKey = (accountKey: CardanoWasm.Bip32PrivateKey, index: number): CardanoWasm.Bip32PublicKey =>
  accountKey
      .derive(0) // External
      .derive(index)
      .to_public();

export const deriveChangePublicKey = (accountKey: CardanoWasm.Bip32PrivateKey, index: number): CardanoWasm.Bip32PublicKey =>
  accountKey
      .derive(1) // Change (Internal)
      .derive(index)
      .to_public();

export const deriveStakePublicKey = (accountKey: CardanoWasm.Bip32PrivateKey, index: number): CardanoWasm.Bip32PublicKey =>
  accountKey
      .derive(2) // Chimeric
      .derive(index)
      .to_public();

export const buildMetadata = (): CardanoWasm.TransactionMetadatum => {
  const map = CardanoWasm.MetadataMap.new();
  
  map.insert(
    CardanoWasm.TransactionMetadatum.new_text("receiver_id"),
    CardanoWasm.TransactionMetadatum.new_text("SJKdj34k3jjKFDKfjFUDfdjkfd"),
  );
  map.insert(
    CardanoWasm.TransactionMetadatum.new_text("sender_id"),
    CardanoWasm.TransactionMetadatum.new_text("jkfdsufjdk34h3Sdfjdhfduf873"),
  );
  map.insert(
    CardanoWasm.TransactionMetadatum.new_text("comment"),
    CardanoWasm.TransactionMetadatum.new_text("happy birthday"),
  );
  
  const tags = CardanoWasm.MetadataList.new();
  tags.add(CardanoWasm.TransactionMetadatum.new_int(CardanoWasm.Int.new(CardanoWasm.BigNum.from_str("0"))));
  tags.add(CardanoWasm.TransactionMetadatum.new_int(CardanoWasm.Int.new(CardanoWasm.BigNum.from_str("264"))));
  tags.add(CardanoWasm.TransactionMetadatum.new_int(CardanoWasm.Int.new_negative(CardanoWasm.BigNum.from_str("1024"))));
  tags.add(CardanoWasm.TransactionMetadatum.new_int(CardanoWasm.Int.new(CardanoWasm.BigNum.from_str("32"))));
  map.insert(
    CardanoWasm.TransactionMetadatum.new_text("tags"),
    CardanoWasm.TransactionMetadatum.new_list(tags),
  );
  const metadatum = CardanoWasm.TransactionMetadatum.new_map(map);
  return metadatum;
}

export const arrayBufferToBase64=( buffer )=> {
  var binary = '';
  var bytes = new Uint8Array( buffer );
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
      binary += String.fromCharCode( bytes[ i ] );
  }
  return Buffer.from(binary, "binary").toString("base64");
}

export const getTxHashFromTxHex=(txHex/*:Uint8Array*/)/*:string*/=>{
  // const txHex           = toHex(transaction.to_bytes());
  const tx               = CardanoWasm.Transaction.from_bytes(fromHex(txHex))
  const txBody        = tx.body() //CardanoWasm().TransactionBody.from_bytes(fromHex(txHex))
  const txHashObj      = CardanoWasm.hash_transaction(txBody);
  const txHash        = toHex(txHashObj.to_bytes())
  if(!txHash) //example: 8a350871ac34cf8cc95a7e0bbf19de8b81a7810ac11d38f02ae9dc1f9e0d284e
      return ""
  return txHash;
}

export const replaceUrlParam=(url, paramName, paramValue) =>
{
    if (paramValue == null) {
        paramValue = '';
    }
    var pattern = new RegExp('\\b('+paramName+'=).*?(&|#|$)');
    if (url.search(pattern)>=0) {
        return url.replace(pattern,'$1' + paramValue + '$2');
    }
    url = url.replace(/[?#]$/,'');
    return url + (url.indexOf('?')>0 ? '&' : '?') + paramName + '=' + paramValue;
}