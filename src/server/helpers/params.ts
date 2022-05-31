import axios from "axios";

export async function getParameters() {
  
  const url = `https://d.graphql-api.testnet.dandelion.link`;

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