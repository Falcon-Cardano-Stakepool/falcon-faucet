import axios from "axios";

export async function getSlotNo() {
  
  const url = `https://d.graphql-api.testnet.dandelion.link`;

  const headers = {
    "content-type": "application/json"
  };

  const query = `
  {
    cardano {
      tip {
        slotNo
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