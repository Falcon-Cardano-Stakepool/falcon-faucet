import { Schema, model, models } from 'mongoose';

// 1. Create an interface representing a document in MongoDB.
export interface Delegator {
  stakeAddress: string;
  adaStake: string;
  availableRewards: string;
}

// 2. Create a Schema corresponding to the document interface.
const schemaDelegator = new Schema<Delegator>({
  stakeAddress: { type: String, required: true },
  adaStake: { type: String, required: true },
  availableRewards: { type: String, required: true },
});

// 3. Create a Model.
export const DelegatorModel = models.Delegator || model<Delegator>('Delegator', schemaDelegator);