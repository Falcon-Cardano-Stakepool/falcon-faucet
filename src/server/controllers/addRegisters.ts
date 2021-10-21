import { RandomModel } from '../db/randomDetails';
import dbConnect from "../lib/dbConnect";

export const addRegisters = async () => {
  
  await dbConnect();

  var table = [];

  for (let index = 45; index < 507; index++) {

      var idEdited = index.toString();
      if(index < 100) {
          idEdited = "0" + index.toString(); 
      }

      const element = new RandomModel({

          id: idEdited,
          sold: "FALSE",
          soldPrice: "11.9" + idEdited,
          fromAddress: "",
          transactionHash: "",
          lastUpdate: ""
      })

      table.push(element);
  
  }

  await RandomModel.insertMany(table); 

}