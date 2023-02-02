import * as express from "express";
import * as cors from "cors";
import { processPayment } from "./controllers/processPayment";
import { getDelegatedAdaList, getDelegations } from "./tangocrypto/delegations";

// Clients
export let clients = [];

class App {
    
  public express;

  constructor() {
    this.express = express();
    this.mountRoutes();
  }

  private mountRoutes(): void {

    const router = express.Router();

    //options for cors midddleware
    const options: cors.CorsOptions = {
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'X-Access-Token'
      ],
      credentials: false,
      methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
      origin: "*",
      preflightContinue: false,
    };

    //use cors middleware
    router.use(cors(options));

    router.get('/delegations/:poolId', async (request, response) => {
      const poolId = request.params.poolId;
      const delegations = await getDelegations(poolId);
      //console.log(delegations);
      response.json({ delegations });
    })

    router.get('/delegations/totalAda/:poolId', async (request, response) => {
      const poolId = request.params.poolId;
      const delegations = await getDelegations(poolId);
      const totalAda = await getDelegatedAdaList(delegations);
      response.json({ totalAda });
    })

    router.post('/', express.json({type: 'application/json'}), (request, response) => {
      
      const event = request.body;
    
      // Handle the event
      switch (event.type) {
        case 'payment':
            console.log("*** Payment event ***");
            console.log(event);
            processPayment(request, response);
          break;
        case 'epoch':
            console.log("*** Epoch event ***");
            // Cada principio de época puedo enviar los FALCON
          break;
        // ... handle other event types
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
    
      // Return a response to acknowledge receipt of the event
      response.json({received: true});

  });

    this.express.use('/', router);

    router.options("*", cors(options));

  }
}

export default new App().express;