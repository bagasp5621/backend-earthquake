const mongoose = require("mongoose");

const earthquakeSchema = new mongoose.Schema({
  datetime: {
    type: Number,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  magnitude: {
    type: Number,
    required: true,
  },
  depth: {
    type: Number,
    required: true,
  },
  cluster_label: {
    type: Number,
    required: true,
  },
});

const Earthquake = mongoose.model("Earthquake", earthquakeSchema);

module.exports = Earthquake;
