import App from './app';
import { addRegisters } from "./controllers/addRegisters";

const port = process.env.PORT || 8000;

addRegisters();

App.listen(port, (err) => {
    
  if (err) {
      console.error(`Error starting server: ${err}`);
      process.abort();
  }
  
  console.log(`Server is listening on port ${port}.`);
  
  return;

});