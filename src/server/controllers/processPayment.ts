import * as dotenv from "dotenv";
dotenv.config();
import { deriveRootKey, deriveAccountKey, deriveSpendPrivateKey } from '../helpers/aux';
import { buildAdaTx, buildMultiAssetTx } from '../helpers/tx';
import { Request, Response } from 'express';

export const processPayment = async (req: Request, res: Response) => {
   
  const event = req.body;
  const outputs = event.data.to.length;
  const minter = event.data.from[0].address;
  var toAddress = "";

  for (let index = 0; index < outputs; index++) {
    const element = event.data.to[index];
    if(element.address === process.env.FAUCET_ADDRESS) {
      toAddress = event.data.to[index].address;
    }
  }
  
  // addr_test1qrf0felty9d44sm5mkg8fgx49szrwzkesfvva4cjn4m78zlqwzqhd5zeqluh2tulus23vmwcq36q0s649ctta988spfs72a00k
  if(toAddress === process.env.FAUCET_ADDRESS) {
    // ACA TENGO QUE MANDAR LA TRANSACCION A LA WALLET QUE ME HIZO EL PAGO
    const rootKey = deriveRootKey(process.env.MNEMONIC);
    const accountKey = deriveAccountKey(rootKey, 0);
    const privateKey = deriveSpendPrivateKey(accountKey, 0).to_raw_key();

    //const adaTransaction = await buildAdaTx(process.env.FAUCET_ADDRESS, minter, "2000000", privateKey);
    const assetTransaction = await buildMultiAssetTx(process.env.FAUCET_ADDRESS, minter, process.env.POLICY_ID, process.env.ASSET_NAME, "1", privateKey);

    //console.log(adaTransaction);

    console.log(assetTransaction);

  } else {
    console.log("Envié a la dirección incorrecta.");
  }
}