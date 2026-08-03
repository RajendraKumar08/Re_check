const express = require('express');
const app = express();

const PORT = 8000;



app.get('/', (req, res) => {
  res.json('Hello World!');
});



app.listen(PORT, () => {
    console.log(`server is runnign at the port ${PORT}`)
    console.log("http://localhost:8000");
})