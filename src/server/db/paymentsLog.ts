import { Schema, model, models } from 'mongoose';

// 1. Create an interface representing a document in MongoDB.
export interface Payment {
  timestamp: string;
  fromAddress: string;
  toAddress: string;
  value: string;
  transactionHash: string;
  blockHash: string;
  message: string
}

// 2. Create a Schema corresponding to the document interface.
const schemaPayment = new Schema<Payment>({
  timestamp: { type: String, required: true },
  fromAddress: { type: String, required: true },
  toAddress: { type: String, required: true },
  value: { type: String, required: true },
  transactionHash: { type: String, required: true },
  blockHash: { type: String, required: true },
  message: { type: String, required: false }
});

// 3. Create a Model.
export const PaymentModel = models.Payment || model<Payment>('Payment', schemaPayment);