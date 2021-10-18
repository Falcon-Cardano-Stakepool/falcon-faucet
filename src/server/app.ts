import * as express from "express";
import cors from "cors";
import { processPaymentSuccess } from "./controllers/processPayment";

// Clients
export let clients = [];

// CORS
const options: cors.CorsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200
};

class App {
    
  public express;

  constructor() {
    this.express = express();
    this.express.use(cors(options));
    this.mountRoutes();
  }

  private mountRoutes(): void {

    const router = express.Router();

    router.get('/payment/:itemId', (request, response) => {

        const headers = {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          'Content-Encoding': "none",
          "Access-Control-Allow-Origin": "*"
        };
        response.writeHead(200, headers);
        
        let itemId = request.params.itemId;
  
        const id = Date.now();
        
        const client = {
          id,
          itemId,
          response,
        };
  
        clients.push(client);
  
        console.log(`Client connected: ${id}`);
        console.log(clients);
  
        request.on("close", () => {
          console.log(`Client disconnected: ${id}`);
          clients = clients.filter((client) => client.id !== id);
          console.log("Me quedan estos clientes: ", clients);
          console.log("Cantidad de clientes conectados que me quedan: ", clients.length);
        })
    })

    router.post('/', express.json({type: 'application/json'}), (request, response) => {
      
        const event = request.body;
      
        // Handle the event
        switch (event.type) {
          case 'payment':
              console.log("*** Payment event ***");
              console.log(JSON.stringify(event.data.payments));
              processPaymentSuccess(request, response);
            break;
          case 'epoch':
              console.log("*** Epoch event ***");
       
            break;
          // ... handle other event types
          default:
            console.log(`Unhandled event type ${event.type}`);
        }
      
        // Return a response to acknowledge receipt of the event
        response.json({received: true});
    });

    this.express.use('/', router);

  }
}

export default new App().express;