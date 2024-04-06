const mongoose = require("mongoose");
const fs = require("fs");
const earthquakeModel = require("../models/earthquakeModel");
require("dotenv").config();

// Connect to MongoDB Atlas
mongoose.connect(
  "mongodb+srv://bagasp5621:5621@earthquake.hnxm6lq.mongodb.net/?retryWrites=true&w=majority&appName=earthquake"
);

// Read JSON file
const jsonData = JSON.parse(fs.readFileSync("cluster_data.json", "utf8"));

// Import JSON data into MongoDB
earthquakeModel
  .insertMany(jsonData)
  .then((docs) => {
    console.log("JSON data imported successfully");
  })
  .catch((err) => {
    console.error(err);
  });
