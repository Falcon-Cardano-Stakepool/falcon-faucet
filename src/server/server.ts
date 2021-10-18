import App from './app';
import cors from "cors";

const port = process.env.PORT || 3000;

App.use(cors({
  origin: "*"
}));

App.listen(port, (err) => {
    
  if (err) {
      console.error(`Error starting server: ${err}`);
      process.abort();
  }
  
  console.log(`Server is listening on port ${port}.`);
  
  return;

});