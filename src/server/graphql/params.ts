import * as dotenv from 'dotenv';
import axios from "axios";
dotenv.config();

export async function getParameters() {
  
  const url = `https://d.graphql-api.${process.env.ENVIRONMENT}.dandelion.link`;

  const headers = {
    "content-type": "application/json"
  };

  const query = `
  {
    genesis {
      alonzo {
        lovelacePerUTxOWord
        maxValueSize
      }
      shelley {
        protocolParams {
          poolDeposit
          keyDeposit
          minUTxOValue
          minFeeA
          minFeeB
          maxTxSize
        }  
      }
    }
  }
`;

  const graphqlQuery = {
      "query": query
  };

  const response = await axios({
    url,
    method: 'post',
    headers: headers,
    data: graphqlQuery
  });

  return response.data;

}