require("dotenv").config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const userRoute = require("./routes/user")
const resumeRoute = require("./routes/resume")
const cors = require("cors");
const resumeRoute = require("./routes/resume");
const cookieParser = require("cookie-parser");

app.use(cors());
app.use(express.json());

const PORT = 8000;

const MONGO_URI = process.env.MONGODB_URI;
mongoose.connect(MONGO_URI).then(() => console.log("Mongo db connected")).catch((err) => console.log("mongodb err", err));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended : true}));


app.get('/', (req, res) => {
  res.json('Hello World!');
});

app.use('/api/resume', resumeRoute);
app.use('/api/user', userRoute);


app.listen(PORT, () => {
    console.log(`server is runnign at the port ${PORT}`)
    console.log("http://localhost:8000");
})