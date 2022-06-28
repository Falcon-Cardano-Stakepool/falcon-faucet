import * as dotenv from 'dotenv';
import axios from "axios";
import { replaceUrlParam } from '../helpers/aux';

dotenv.config();

export async function getDelegations(poolId) {
  
  var url = `https://cardano-${process.env.ENVIRONMENT}.tangocrypto.com/${process.env.TANGO_APP_ID}/v1/pools/${poolId}/delegations`;

  const headers = {
    "content-type": "application/json",
    "x-api-key": process.env.TANGO_API_KEY
  };

  const response = await axios({ url, method: 'get', headers: headers });
  
  if(response.data.cursor === null) {
    return response.data.data;
  } else {
    // I call again until cursor === null
    var result = response.data.data;
    var newUrl = url + `?cursor=${response.data.cursor}`;
    console.log("nueva URL es: ", newUrl);

    do {

      var auxCall = await axios({ url: newUrl, method: 'get', headers: headers });
      if(auxCall.data.cursor !== null) {
        newUrl = replaceUrlParam(newUrl, "cursor", auxCall.data.cursor);
      }

      result.push(...auxCall.data.data);
      console.log("Resultado PARCIAL: ", result);

    } while(auxCall.data.cursor !== null);

    console.log("Resultado final: ", result);

    return result;

  }

}