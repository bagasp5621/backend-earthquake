const express = require("express");
const router = express.Router();

const getEarthquakeRiskByLatLng = require("../controllers/earthquakes/getEarthquakeRiskByLatLng");
const getEarthquakePolygon = require("../controllers/earthquakes/getEarthquakePolygon");
const getProvinceStatistic = require("../controllers/earthquakes/getProvinceStatistic");
const getGeneralStatistic = require("../controllers/earthquakes/getGeneralStatistic");
const getFilterEarthquake = require("../controllers/earthquakes/getFilterEarthquake");

router.get("/risk", getEarthquakeRiskByLatLng);
router.get("/polygon", getEarthquakePolygon);
router.get("/province", getProvinceStatistic);
router.get("/statistic", getGeneralStatistic);
router.get("/filter", getFilterEarthquake);

module.exports = router;
