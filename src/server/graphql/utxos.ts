import axios from "axios";
import * as CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";

export const getTxUnspentOutputs = async (address: string) => {
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

      const input = utxo.input()
      const txid = input.transaction_id().to_bytes().toString();
      const txindx = input.index()
      const output = utxo.output()
      const amount = output.amount().coin().to_str() // amount in lovelace
      const multiasset = output.amount().multiasset()
      let multiAssetStr = ''

      if (multiasset) {
        const keys = multiasset.keys() // policy Ids of the multiassets
        const N = keys.len()
        // console.log(`${N} Multiassets in the UTXO`)

        for (let i = 0; i < N; i++) {
          const policyId = keys.get(i)
          const policyIdHex = policyId.to_bytes().toString();
          const assets = multiasset.get(policyId)
          const assetNames = assets?.keys()
          const K = assetNames?.len() ?? 0

          for (let j = 0; j < K; j++) {
            const assetName = assetNames?.get(j)
            const assetNameString = assetName?.name().toString()
            const assetNameHex = assetName?.name().toString()
            const multiassetAmt = multiasset.get_asset(policyId, assetName!)
            multiAssetStr += `+ ${multiassetAmt.to_str()} + ${policyIdHex}.${assetNameHex} (${assetNameString})`
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
    }
    return Utxos
  } catch (error) {
    console.log(error)
  }
}