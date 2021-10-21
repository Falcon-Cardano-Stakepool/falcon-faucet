import { ProductModel } from '../db/productDetails';
import { RandomModel } from '../db/randomDetails';
import dbConnect from "../lib/dbConnect";

export const housekeeping = async () => {
  
  await dbConnect();
  check44();
  checkRandoms();
  return;

}

const check44 = async () => {
  
  ProductModel.find({ sold: "PENDING", lastUpdate: { $ne: null } }).then(function(products) {
    products.forEach(async function(producto) {
      let currentDate = new Date();
      if(currentDate.getTime() - producto.lastUpdate.getTime() > 600000) {
        console.log(`El tiempo transcurrido para el item ${producto.id} es mas de 600000.`);
        producto.sold = "FALSE";
        producto.lastUpdate = Date();
        await producto.save();
      }
    })
  });

}

const checkRandoms = async () => {

  RandomModel.find({ sold: "PENDING", lastUpdate: { $ne: null } }).then(function(randoms) {
    randoms.forEach(async function(random) {
      let currentDate = new Date();
      if(currentDate.getTime() - random.lastUpdate.getTime() > 600000) {
        console.log(`El tiempo transcurrido para el item ${random.id} es mas de 600000.`);
        random.sold = "FALSE";
        random.lastUpdate = Date();
        await random.save();
      }
    })
  });

  RandomModel.countDocuments({ sold: "FALSE" }).then(async function(cantidad) {
    console.log(`La cantidad de Randoms disponibles es ${cantidad}.`);
    await ProductModel.findOneAndUpdate( { id: "0" }, { quantity: cantidad.toString() });
  })
  
}