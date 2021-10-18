import * as dotenv from "dotenv";
dotenv.config();
import { Schema, model, models, connect } from 'mongoose';

// 1. Create an interface representing a document in MongoDB.
export interface Product {
  id: string;
  name: string;
  image: string;
  description: string;
  price: string;
  manufacturer: string;
  type: string;
  quantity: string;
  author: string;
  sold: string;
  soldPrice: string;
  address: string;
  fromAddress: string;
  transactionHash: string;
}

// 2. Create a Schema corresponding to the document interface.
const schemaProduct = new Schema<Product>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  image: { type: String, required: false },
  description: { type: String, required: false },
  price: { type: String, required: true },
  manufacturer: { type: String, required: true },
  type: { type: String, required: false },
  quantity: { type: String, required: false },
  author: { type: String, required: false },
  sold: { type: String, required: false },
  soldPrice: { type: String, required: false },
  address: { type: String, required: false},
  fromAddress: { type: String, required: false},
  transactionHash: { type: String, required: false},
});

// 3. Create a Model.
export const ProductModel = models.Product || model<Product>('Product', schemaProduct);

run().catch(err => console.log(err));

async function run(): Promise<void> {
  // 4. Connect to MongoDB
  await connect(process.env.URLDB);

}