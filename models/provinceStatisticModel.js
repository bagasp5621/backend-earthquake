const mongoose = require("mongoose");

const ProvinceStatisticSchema = new mongoose.Schema({
  province: {
    type: String,
    required: true,
    unique: true,
  },
  earthquakeCount: {
    type: Number,
    required: true,
    default: 0,
  },
});

const ProvinceStatistic = mongoose.model(
  "ProvinceStatistic",
  ProvinceStatisticSchema
);

module.exports = ProvinceStatistic;
