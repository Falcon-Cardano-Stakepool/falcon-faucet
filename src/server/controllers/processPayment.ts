import * as dotenv from "dotenv";
dotenv.config();
import { deriveRootKey, deriveAccountKey, deriveSpendPrivateKey } from '../helpers/aux';
import { buildAdaTx, buildMultiAssetTx } from '../helpers/tx';
import { startCardanoOgmiosClient, submitTransaction } from '../ogmios/CardanoOgmios';
import { Request, Response } from 'express';

export const processPayment = async (req: Request, res: Response) => {
   
  const event = req.body;
  const outputs = event.data.to.length;
  const minter = event.data.from[0].address;
  var toAddress = "";
  var valueReceived = "";

  for (let index = 0; index < outputs; index++) {
    const element = event.data.to[index];
    if(element.address === process.env.FAUCET_ADDRESS) {
      valueReceived = event.data.to[index].value;
      toAddress = event.data.to[index].address;
    }
  }
  
  if(toAddress === process.env.FAUCET_ADDRESS) {
    if(minter === process.env.FAUCET_ADDRESS) {
      //console.log("Este es el vuelto");
      return;
    }

    if(valueReceived >= process.env.NFT_VALUE) {
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
      console.log("Envié a la dirección incorrecta.");
    }
  }
}