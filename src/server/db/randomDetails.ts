import { Schema, model, models } from 'mongoose';

// 1. Create an interface representing a document in MongoDB.
interface Random {
  id: string;
  sold: string;
  soldPrice: string;
  fromAddress: string;
  transactionHash: string;
  lastUpdate: Date;
}

// 2. Create a Schema corresponding to the document interface.
const schemaRandom = new Schema<Random>({
  id: { type: String, required: true },
  sold: { type: String, required: true },
  soldPrice: { type: String, required: false},
  fromAddress: { type: String, required: false},
  transactionHash: { type: String, required: false},
  lastUpdate: { type: Date, required: false},
});

// 3. Create a Model.
export const RandomModel = models.Random || model<Random>('Random', schemaRandom);