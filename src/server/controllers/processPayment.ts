import { Request, Response } from 'express';
import { ProductModel } from '../db/productDetails';
import { RandomModel } from '../db/randomDetails';
import { PaymentModel } from '../db/paymentsLog';
import dbConnect from "../lib/dbConnect";
import { clients } from "../app";

export const processPaymentSuccess = async (req: Request, res: Response) => {
  
  await dbConnect();

  const event = req.body;

  const inputs = event.data.payments[0].from.length;
  const fromAddress = event.data.payments[0].from[0].address;
  const toAddress = event.data.payments[0].to[0].address;
  var valueReceived = 0;
  var productPrice = 0;
  var foundClient : any = 0;

  if(inputs === 1) {
    //valueReceived = parseInt(event.data.payments[0].from[0].value, 10);
    valueReceived = parseInt(event.data.payments[0].to[0].value, 10);
  } else {
    // El valor recibido es la sumatoria de todas las UTXOs de input
    event.data.payments[0].to.forEach(async function(utxo) {
      valueReceived = valueReceived + parseInt(utxo.value, 10);
      console.log("Value of Utxos: ", valueReceived);
    });
  }

  if(toAddress === "addr1q9fjnadwv55x2quj7ct8dt9hzp3d58r6wrw6fjta3p59u70qjgr2uwmzzxzd5rv93g97ys9q3v8cg08vakhhfzztqq8q3ma5u4") {
    // Recibí un pago para los Random
    var valueReceivedEdited = (valueReceived / 1000000).toFixed(4).toString();;
    var random = await RandomModel.findOne({ soldPrice: valueReceivedEdited, sold: "PENDING" }).exec();
    if(random === null) {
      // Me guardo este pago en una tabla de logs.
      const pago = new PaymentModel({
        timestamp: Date(),
        fromAddress: fromAddress,
        toAddress: toAddress,
        value: valueReceived,
        transactionHash: event.data.payments[0].transaction.hash,
        blockHash: event.data.payments[0].transaction.block.hash,
        message: `Recibí un pago para Random con un valor erróneo de ${valueReceivedEdited}.`,
        trama: JSON.stringify(event.data.payments[0])
      });
      await pago.save();
      return;
    }
    productPrice = parseFloat(random.soldPrice) * 1000000;
    if(valueReceived >= productPrice) {
      random.sold = "TRUE";
      random.transactionHash = event.data.payments[0].transaction.hash;
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
        transactionHash: event.data.payments[0].transaction.hash,
        blockHash: event.data.payments[0].transaction.block.hash,
        message: `Recibí un pago para Random con un valor menor al precio de venta.`,
        trama: JSON.stringify(event.data.payments[0])
      });
      await pago.save();
      return;
    }
  } else {
    var producto = await ProductModel.findOne({ address: toAddress }).exec();
    if(producto === null) {
      // Me guardo este pago en una tabla de logs.
      const pago = new PaymentModel({
        timestamp: Date(),
        fromAddress: fromAddress,
        toAddress: toAddress,
        value: valueReceived,
        transactionHash: event.data.payments[0].transaction.hash,
        blockHash: event.data.payments[0].transaction.block.hash,
        message: `Recibí un pago para una dirección que no está en la BD: ${toAddress}`,
        trama: JSON.stringify(event.data.payments[0])
      });
      await pago.save();
      return;
    }

    productPrice = Math.trunc(producto.price) * 1000000;
    if(valueReceived >= productPrice) {
      producto.sold = "TRUE";
      producto.soldPrice = producto.price;
      producto.transactionHash = event.data.payments[0].transaction.hash;
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
        transactionHash: event.data.payments[0].transaction.hash,
        blockHash: event.data.payments[0].transaction.block.hash,
        message: "Recibí un pago NO Random con un valor menor al precio de venta.",
        trama: JSON.stringify(event.data.payments[0])
      });
      await pago.save();
      return;
    }
  }
}