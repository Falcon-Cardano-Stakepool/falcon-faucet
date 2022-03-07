import { Request, Response } from 'express';
import { ProductModel } from '../db/productDetails';
import { RandomModel } from '../db/randomDetails';
import { PaymentModel } from '../db/paymentsLog';
import dbConnect from "../lib/dbConnect";
import { clients } from "../app";

export const processPaymentSuccess = async (req: Request, res: Response) => {
  
  await dbConnect();

  const event = req.body;
  const outputs = event.data.to.length;
  const fromAddress = event.data.from[0].address;
  var toAddress = event.data.to[0].address
  var valueReceived = 0;
  var productPrice = 0;
  var foundClient : any = 0;

/*   console.log("TO: \n");
  console.log("0: ", JSON.stringify(event.data.to[0].address));
  console.log("1: ", JSON.stringify(event.data.to[1].address)); */

  for (let index = 0; index < outputs; index++) {
    const element = event.data.to[index];
    if(element.address !== fromAddress) {
      valueReceived = parseInt(event.data.to[index].value, 10);
      toAddress = event.data.to[index].address;
    }
  }
  
  console.log("Value Received: ", valueReceived);
  // addr_test1qrf0felty9d44sm5mkg8fgx49szrwzkesfvva4cjn4m78zlqwzqhd5zeqluh2tulus23vmwcq36q0s649ctta988spfs72a00k
  if(toAddress === "addr1q9fjnadwv55x2quj7ct8dt9hzp3d58r6wrw6fjta3p59u70qjgr2uwmzzxzd5rv93g97ys9q3v8cg08vakhhfzztqq8q3ma5u4") {
    // Recibí un pago para los Random
    var valueReceivedEdited = (valueReceived / 1000000).toFixed(4).toString();;
    var random = await RandomModel.findOne({ soldPrice: valueReceivedEdited, sold: "FALSE" }).exec();
    if(random === null) {
      // Me guardo este pago en una tabla de logs.
      const pago = new PaymentModel({
        timestamp: Date(),
        fromAddress: fromAddress,
        toAddress: toAddress,
        value: valueReceived,
        transactionHash: event.data.transaction.hash,
        blockHash: event.data.transaction.block.hash,
        message: `Recibí un pago para Random con un valor erróneo de ${valueReceivedEdited}.`,
        trama: JSON.stringify(event.data)
      });
      await pago.save();
      return;
    }
    productPrice = parseFloat(random.soldPrice) * 1000000;
    if(valueReceived >= productPrice) {
      random.sold = "TRUE";
      random.transactionHash = event.data.transaction.hash;
      random.fromAddress = fromAddress;
      random.lastUpdate = Date();
      await random.save();
      foundClient = clients.find(element => element.itemId === random.id);
      console.log(foundClient);
      foundClient.response.write(`data: ${JSON.stringify(`${random.id}`)}\n\n`)
    } else {
      // Me guardo este pago en una tabla de logs.
      const pago = new PaymentModel({
        timestamp: Date(),
        fromAddress: fromAddress,
        toAddress: toAddress,
        value: valueReceived,
        transactionHash: event.data.transaction.hash,
        blockHash: event.data.transaction.block.hash,
        message: `Recibí un pago para Random con un valor menor al precio de venta.`,
        trama: JSON.stringify(event.data)
      });
      await pago.save();
      return;
    }
  } else {
    console.log("Voy a buscar por direccion o no RANDOM");
    var producto = await ProductModel.findOne({ address: toAddress }).exec();
    console.log(producto);
    if(producto === null) {
      // Me guardo este pago en una tabla de logs.
      const pago = new PaymentModel({
        timestamp: Date(),
        fromAddress: fromAddress,
        toAddress: toAddress,
        value: valueReceived,
        transactionHash: event.data.transaction.hash,
        blockHash: event.data.transaction.block.hash,
        message: `Recibí un pago para una dirección que no está en la BD: ${toAddress}`,
        trama: JSON.stringify(event.data)
      });
      await pago.save();
      return;
    }

    productPrice = Math.trunc(producto.price) * 1000000;
    if(valueReceived >= productPrice) {
      producto.sold = "TRUE";
      producto.soldPrice = producto.price;
      producto.transactionHash = event.data.transaction.hash;
      producto.fromAddress = fromAddress;
      producto.lastUpdate = Date();
      await producto.save();
      // Acá tengo que avisar al cliente que el pago fue realizado
      foundClient = clients.find(element => element.itemId === producto.id);
      //response.write('data: {"flight": "I768", "state": "landing"}');
      foundClient.response.write(`data: ${JSON.stringify(`${producto.id}`)}\n\n`)
    } else {
      // Me guardo este pago en una tabla de logs.
      const pago = new PaymentModel({
        timestamp: Date(),
        fromAddress: fromAddress,
        toAddress: toAddress,
        value: valueReceived,
        transactionHash: event.data.transaction.hash,
        blockHash: event.data.transaction.block.hash,
        message: "Recibí un pago NO Random con un valor menor al precio de venta.",
        trama: JSON.stringify(event.data)
      });
      await pago.save();
      return;
    }
  }
}