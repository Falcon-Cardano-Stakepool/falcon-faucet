import * as bip39 from "bip39";
import axios from "axios";
import * as CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";
import { getParameters } from "../helpers/params";
import { getSlotNo } from "../helpers/slot";

export function toHexString(byteArray: Uint8Array) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}

export function harden(num: number) {
  return 0x80000000 + num;
}

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

const getTxUnspentOutputs = async (address: string) => {
  const txOutputs = CardanoWasm.TransactionUnspentOutputs.new()
  const utxos = await getUTxOs(address)
  for (const utxo of utxos) {
    txOutputs.add(utxo.TransactionUnspentOutput)
  }
  return txOutputs
}

async function getUTxOs(address: string) {

  const url = `https://d.graphql-api.testnet.dandelion.link`;

  const headers = {
    "content-type": "application/json"
  };

  const query = `
  {
    utxos(where: { address: { _in: "${address}" } }) {
      transaction {
        hash
      }
      index
      value
      address
      tokens {
        asset {
          policyId
          assetId
          assetName
        }
        quantity
      }
    }
  }
  `;

  const graphqlQuery = {
    "query": query
  };

  const response = await axios({
    url,
    method: 'post',
    headers: headers,
    data: graphqlQuery
  });

  const Utxos = []
  
  try {
    const rawUtxos = response.data.data.utxos
    for (const rawUtxo of rawUtxos) {
      var utxo: CardanoWasm.TransactionUnspentOutput;
      if(rawUtxo.tokens.length > 0) {
        const multiAsset = CardanoWasm.MultiAsset.new()
        const assets = CardanoWasm.Assets.new()
        for (const token of rawUtxo.tokens) {
          assets.insert(
            CardanoWasm.AssetName.new(Buffer.from(token.asset.assetName, "hex")),
            CardanoWasm.BigNum.from_str(token.quantity)
          )
          multiAsset.insert(CardanoWasm.ScriptHash.from_bytes(Buffer.from(token.asset.policyId, "hex")), assets)
        }
        utxo = CardanoWasm.TransactionUnspentOutput.new(
          CardanoWasm.TransactionInput.new(CardanoWasm.TransactionHash.from_bytes(Buffer.from(rawUtxo.transaction.hash, "hex")), rawUtxo.index), 
          CardanoWasm.TransactionOutputBuilder.new()
            .with_address(CardanoWasm.Address.from_bech32(rawUtxo.address))
            .next()
            .with_coin_and_asset(CardanoWasm.BigNum.from_str(rawUtxo.value), multiAsset)
            .build()          
        )
      } else {
        utxo = CardanoWasm.TransactionUnspentOutput.new(
          CardanoWasm.TransactionInput.new(CardanoWasm.TransactionHash.from_bytes(Buffer.from(rawUtxo.transaction.hash, "hex")), rawUtxo.index), 
          CardanoWasm.TransactionOutputBuilder.new()
            .with_address(CardanoWasm.Address.from_bech32(rawUtxo.address))
            .next()
            .with_value(CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(rawUtxo.value)))
            .build()          
        )
      }

      console.log("utxo: ", utxo);
      const input = utxo.input()
      console.log("input: ", input);
      const txid = input.transaction_id().to_bytes().toString();
      console.log("txid: ", txid);
      const txindx = input.index()
      console.log("txindx: ", txindx);
      const output = utxo.output()
      console.log("output: ", output);
      const amount = output.amount().coin().to_str() // amount in lovelace
      console.log("amount: ", amount);
      const multiasset = output.amount().multiasset()
      console.log("multiasset: ", multiasset);
      let multiAssetStr = ''

      if (multiasset) {
        const keys = multiasset.keys() // policy Ids of the multiassets
        const N = keys.len()
        // console.log(`${N} Multiassets in the UTXO`)

        for (let i = 0; i < N; i++) {
          const policyId = keys.get(i)
          const policyIdHex = policyId.to_bytes().toString();
          // console.log(`policyId: ${policyIdHex}`)
          const assets = multiasset.get(policyId)
          const assetNames = assets?.keys()
          const K = assetNames?.len() ?? 0
          // console.log(`${K} Assets in the Multiasset`)

          for (let j = 0; j < K; j++) {
            const assetName = assetNames?.get(j)
            const assetNameString = assetName?.name().toString()
            const assetNameHex = assetName?.name().toString()
            const multiassetAmt = multiasset.get_asset(policyId, assetName!)
            multiAssetStr += `+ ${multiassetAmt.to_str()} + ${policyIdHex}.${assetNameHex} (${assetNameString})`
            // console.log(assetNameString)
            // console.log(`Asset Name: ${assetNameHex}`)
          }
        }
      }

      const utxoObj = {
        txid: txid,
        txindx: txindx,
        amount: amount,
        str: `${txid} #${txindx} = ${amount}`,
        multiAssetStr: multiAssetStr,
        TransactionUnspentOutput: utxo,
      }
      console.log("utxo object: ", utxoObj);
      Utxos.push(utxoObj)
      // console.log(`utxo: ${str}`)
    }
    return Utxos
  } catch (error) {
    console.log(error)
  }
}

export async function buildAdaTx(fromAddress: string, toAddress: string, amount: string, privateKey: CardanoWasm.PrivateKey) {
  
  const params = await getParameters();

  const linearFee = CardanoWasm.LinearFee.new(
    CardanoWasm.BigNum.from_str(params.data.genesis.shelley.protocolParams.minFeeA.toString()),
    CardanoWasm.BigNum.from_str(params.data.genesis.shelley.protocolParams.minFeeB.toString())
  );
  
  const txBuilderConfig = CardanoWasm.TransactionBuilderConfigBuilder.new()
    .fee_algo(linearFee)
    .pool_deposit(CardanoWasm.BigNum.from_str(params.data.genesis.shelley.protocolParams.poolDeposit.toString()))
    .key_deposit(CardanoWasm.BigNum.from_str(params.data.genesis.shelley.protocolParams.keyDeposit.toString()))
    .max_value_size(params.data.genesis.alonzo.maxValueSize)
    .max_tx_size(params.data.genesis.shelley.protocolParams.maxTxSize)
    .coins_per_utxo_word(CardanoWasm.BigNum.from_str(params.data.genesis.alonzo.lovelacePerUTxOWord.toString()))
    .build();

  // instantiate the tx builder with the Cardano protocol parameters - these may change later on
  const txBuilder = CardanoWasm.TransactionBuilder.new(txBuilderConfig);

  const utxos = await getUTxOs(fromAddress);
  
  const unspentOutputs = CardanoWasm.TransactionUnspentOutputs.new();
  
/*   utxos.data.utxos.forEach(x => 
    unspentOutputs.add(
      CardanoWasm.TransactionUnspentOutput.new(
        CardanoWasm.TransactionInput.new(CardanoWasm.TransactionHash.from_bytes(Buffer.from(x.transaction.hash, "hex")), x.index), 
        CardanoWasm.TransactionOutput.new(CardanoWasm.Address.from_bech32(x.address), CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(x.value)))
      )
    )
  ); */

  // pointer address
  const shelleyChangeAddress = CardanoWasm.Address.from_bech32(fromAddress);

  const minter = CardanoWasm.Address.from_bech32(toAddress);

  // add output to the tx
  txBuilder.add_output(
    CardanoWasm.TransactionOutput.new(
    minter,
    CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(amount))    
    ),
  );

  // add a keyhash input - for ADA held in a Shelley-era normal address (Base, Enterprise, Pointer)
  txBuilder.add_inputs_from(unspentOutputs, 2); // LargestFirstMultiAsset

  // set the time to live - the absolute slot value before the tx becomes invalid
  const slot = await getSlotNo();
  txBuilder.set_ttl(65611114 + 10000);

  // calculate the min fee required and send any change to an address
  txBuilder.add_change_if_needed(shelleyChangeAddress)

  // once the transaction is ready, we build it to get the tx body without witnesses
  const txBody = txBuilder.build()
  const txHash = CardanoWasm.hash_transaction(txBody);
  const witnesses = CardanoWasm.TransactionWitnessSet.new();
  const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
  const vkeyWitness1 = CardanoWasm.make_vkey_witness(txHash, privateKey);

  vkeyWitnesses.add(vkeyWitness1);

  witnesses.set_vkeys(vkeyWitnesses);
  witnesses.set_native_scripts(CardanoWasm.NativeScripts.new());
  
  // create the finalized transaction with witnesses
  const transaction = CardanoWasm.Transaction.new(
    txBody,
    witnesses,
    undefined, // transaction metadata
  ); 

  return toHexString(transaction.to_bytes());

}

export async function buildMultiAssetTx(
  fromAddress: string, 
  toAddress: string, 
  policy: string, 
  asset: string, 
  assetName: string, 
  amount: string, 
  privateKey: CardanoWasm.PrivateKey
) {
  
  const params = await getParameters();

  const linearFee = CardanoWasm.LinearFee.new(
    CardanoWasm.BigNum.from_str(params.data.genesis.shelley.protocolParams.minFeeA.toString()),
    CardanoWasm.BigNum.from_str(params.data.genesis.shelley.protocolParams.minFeeB.toString())
  );
  
  const txBuilderConfig = CardanoWasm.TransactionBuilderConfigBuilder.new()
    .fee_algo(linearFee)
    .pool_deposit(CardanoWasm.BigNum.from_str(params.data.genesis.shelley.protocolParams.poolDeposit.toString()))
    .key_deposit(CardanoWasm.BigNum.from_str(params.data.genesis.shelley.protocolParams.keyDeposit.toString()))
    .max_value_size(params.data.genesis.alonzo.maxValueSize)
    .max_tx_size(params.data.genesis.shelley.protocolParams.maxTxSize)
    .coins_per_utxo_word(CardanoWasm.BigNum.from_str(params.data.genesis.alonzo.lovelacePerUTxOWord.toString()))
    .build();

  // instantiate the tx builder with the Cardano protocol parameters - these may change later on
  const txBuilder = CardanoWasm.TransactionBuilder.new(txBuilderConfig);

  const unspentOutputs = await getTxUnspentOutputs(fromAddress);
   
  // pointer address
  const shelleyChangeAddress = CardanoWasm.Address.from_bech32(fromAddress);

  const minter = CardanoWasm.Address.from_bech32(toAddress);
  
  var txOutputBuilder = CardanoWasm.TransactionOutputBuilder.new();
  txOutputBuilder = txOutputBuilder.with_address(minter);
  var txOutputAmountBuilder = txOutputBuilder.next();

  const multiAsset = CardanoWasm.MultiAsset.new()

  const assets = CardanoWasm.Assets.new()
  assets.insert(
    CardanoWasm.AssetName.new(Buffer.from(assetName, "hex")), // Asset Name
    CardanoWasm.BigNum.from_str(amount) // How much to send
  );
  multiAsset.insert(
    CardanoWasm.ScriptHash.from_bytes(Buffer.from(policy, "hex")), // PolicyID
    assets
  );
  
  txOutputAmountBuilder = txOutputAmountBuilder.with_asset_and_min_required_coin(multiAsset, CardanoWasm.BigNum.from_str(params.data.genesis.alonzo.lovelacePerUTxOWord.toString()))
  const txOutput = txOutputAmountBuilder.build();

  txBuilder.add_output(txOutput)

  // add a keyhash input - for ADA held in a Shelley-era normal address (Base, Enterprise, Pointer)
  txBuilder.add_inputs_from(unspentOutputs, 3); // LargestFirstMultiAsset

  // set the time to live - the absolute slot value before the tx becomes invalid
  const slot = await getSlotNo();
  txBuilder.set_ttl(slot.data.cardano.tip.slotNo + 10000);

  // calculate the min fee required and send any change to an address
  txBuilder.add_change_if_needed(shelleyChangeAddress)

  // once the transaction is ready, we build it to get the tx body without witnesses
  const txBody = txBuilder.build()
  const txHash = CardanoWasm.hash_transaction(txBody);
  const witnesses = CardanoWasm.TransactionWitnessSet.new();
  const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
  const vkeyWitness1 = CardanoWasm.make_vkey_witness(txHash, privateKey);

  vkeyWitnesses.add(vkeyWitness1);

  witnesses.set_vkeys(vkeyWitnesses);
  witnesses.set_native_scripts(CardanoWasm.NativeScripts.new());
  
  // create the finalized transaction with witnesses
  const transaction = CardanoWasm.Transaction.new(
    txBody,
    witnesses,
    undefined, // transaction metadata
  );

  return toHexString(transaction.to_bytes());

}