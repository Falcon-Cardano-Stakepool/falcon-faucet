import App from './app';

const port = process.env.PORT || 8000;

App.listen(port, (err) => {
    
  if (err) {
      console.error(`Error starting server: ${err}`);
      process.abort();
  }
  
  console.log(`Server is listening on port ${port}.`);
  
  return;

});