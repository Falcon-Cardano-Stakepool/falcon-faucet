import * as CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";
import { toHexString } from "./aux";
import { getParameters } from "../graphql/params";
import { getSlotNo } from "../graphql/slot";
import { getTxUnspentOutputs } from "../graphql/utxos";

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

  const utxos = await getTxUnspentOutputs(fromAddress);
  
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