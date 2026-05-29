require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");

const app = express();

// middlewares
// מאפשר לאתר לדבר עם השרת
app.use(cors());

// מהבקשה JSON מאפשר לשרת לקרוא מידע מסוג  
app.use(express.json());

// API routes
app.use("/api", routes);

// port
const port = process.env.PORT || 4000;

// start server
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});