import * as express from "express";
import * as cors from "cors";
import { processPaymentSuccess } from "./controllers/processPayment";
import { housekeeping } from "./controllers/housekeeping";

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

    router.get('/payment/:itemId', (request, response) => {

        const headers = {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
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
        
        var keepAliveConnection = setInterval(function() {
          response.write("\n\n");
        }, 10 * 1000);

        request.on("close", () => {
          console.log(`Client disconnected: ${id}`);
          clearInterval(keepAliveConnection);
          clients = clients.filter((client) => client.id !== id);
        })
    })

    router.post('/', express.json({type: 'application/json'}), (request, response) => {
      
        const event = request.body;
      
        // Handle the event
        switch (event.type) {
          case 'payment':
              console.log("*** Payment event ***");
              console.log(event);
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

    router.options("*", cors(options));

    // Housekeeping Background Process every 2 minutes
    setInterval(function() {
      housekeeping();
    }, 60 * 2 * 1000);

  }
}

export default new App().express;