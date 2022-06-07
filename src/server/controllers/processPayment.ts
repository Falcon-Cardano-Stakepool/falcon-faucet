import * as dotenv from "dotenv";
dotenv.config();
import { deriveRootKey, deriveAccountKey, deriveSpendPrivateKey } from '../helpers/aux';
import { buildAdaTx, buildMultiAssetTx } from '../helpers/tx';
import { startCardanoOgmiosClient, submitTransaction } from '../ogmios/CardanoOgmios';
import { Request, Response } from 'express';

export const processPayment = async (req: Request, res: Response) => {
   
  const event = req.body;
  const inputs = event.data.from.length;
  const minter = event.data.from[0].address;
  var valueReceived = 0;

  for (let index = 0; index < inputs; index++) {
    const element = event.data.from[index];
    if(element.address === process.env.FAUCET_ADDRESS) {
      console.log("Esto es un vuelto.");
      return;
    } else {
      valueReceived += parseInt(element.value, 10);
    }
  }

  //if(toAddress === process.env.FAUCET_ADDRESS) {

  if(minter === process.env.FAUCET_ADDRESS) {
    //console.log("Este es el vuelto");
    return;
  }

  if(valueReceived >= parseInt(process.env.NFT_VALUE)) {
    // ACA TENGO QUE AGREGAR LA LOGICA PARA DESENCRIPTAR
    // process.env.MNEMONIC va a venir encriptado
    // ACA TENGO QUE MANDAR LA TRANSACCION A LA WALLET QUE ME HIZO EL PAGO
    const rootKey = deriveRootKey(process.env.MNEMONIC);
    const accountKey = deriveAccountKey(rootKey, 0);
    const privateKey = deriveSpendPrivateKey(accountKey, 0).to_raw_key();

    //const adaTransaction = await buildAdaTx(process.env.FAUCET_ADDRESS, minter, "2000000", privateKey);
    const assetTransaction = await buildMultiAssetTx(process.env.FAUCET_ADDRESS, minter, process.env.POLICY_ID, process.env.ASSET_NAME, process.env.AMOUNT_TO_SEND, privateKey);

    //console.log(assetTransaction);
    const ogmiosClient = await startCardanoOgmiosClient();
    const result = await submitTransaction(ogmiosClient, assetTransaction);
    console.log(result);
    } else {
      console.log(`Me enviaron menos de ${process.env.NFT_VALUE} lovelaces.`);
  }
  //} else {
  //  console.log(`Se cancela el envío a la dirección ${process.env.FAUCET_ADDRESS} del Faucet.`);
  //}
}