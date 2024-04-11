const express = require("express");
const router = express.Router();

const getEarthquakeRiskByLatLng = require("../controllers/earthquakes/getEarthquakeRiskByLatLng");
const getEarthquakePolygon = require("../controllers/earthquakes/getEarthquakePolygon");
const getProvinceStatistic = require("../controllers/earthquakes/getProvinceStatistic");

/* GET home page. */
router.get("/risk", getEarthquakeRiskByLatLng);
router.get("/polygon", getEarthquakePolygon);
router.get("/province", getProvinceStatistic);

module.exports = router;
