const express = require("express");
const router = express.Router();

const earthquakeController = require("../controllers/earthquakeController");

/* GET home page. */
router.get("/risk", earthquakeController.getEarthquakeRiskByLatLng);
router.get("/polygon", earthquakeController.getEarthquakePolygon);

module.exports = router;
