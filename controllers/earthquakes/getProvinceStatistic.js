const fs = require("fs");
const path = require("path");
const Earthquake = require("../../models/earthquakeModel");
const ProvinceStatistic = require("../../models/provinceStatisticModel");
const pointInPolygon = require("point-in-polygon");

const indonesiaProvinceGeoJSON = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../public/indonesiaProvince.json"))
);

const getProvinceStatistic = async (req, res, next) => {
  try {
    // Check if recalculate parameter is provided and true
    const recalculate = req.query.recalculate === "true";

    let provinceEarthquakeCounts;

    if (recalculate) {
      // Fetch earthquakes from the database
      const earthquakes = await Earthquake.find({});

      // Initialize an object to store earthquake counts by province
      provinceEarthquakeCounts = {};

      // Iterate over each feature in indonesiaProvinceGeoJSON and pre-process the polygons
      const preProcessedProvinces = indonesiaProvinceGeoJSON.features.map(
        (feature) => ({
          name: feature.properties.Propinsi,
          polygons: flattenCoordinates(feature.geometry.coordinates),
        })
      );

      // Loop through each earthquake
      earthquakes.forEach((earthquake) => {
        // Determine the province for the earthquake
        const province = determineProvince(earthquake, preProcessedProvinces);

        // Increment the earthquake count for the province
        provinceEarthquakeCounts[province] =
          (provinceEarthquakeCounts[province] || 0) + 1;
      });

      // Save or update the province earthquake counts in the database
      await saveOrUpdateProvinceStatistics(provinceEarthquakeCounts);
    } else {
      // Fetch province earthquake counts from the database
      provinceEarthquakeCounts = await getProvinceStatistics();
    }

    // Send response with earthquake counts by province
    res.status(200).json({
      message: "Earthquake Statistic by Province",
      data: provinceEarthquakeCounts,
    });
  } catch (error) {
    next(error);
  }
};

function determineProvince(earthquake, preProcessedProvinces) {
  // Iterate over pre-processed provinces
  for (const province of preProcessedProvinces) {
    // Check if the earthquake's coordinates fall within any polygon of the province
    if (
      pointInPolygon(
        [earthquake.longitude, earthquake.latitude],
        province.polygons
      )
    ) {
      return province.name;
    }
  }

  // If the province cannot be determined, return "Unknown"
  return "Di Laut Atau Negara Lain";
}

function flattenCoordinates(coordinates) {
  // Initialize an empty array to store the flattened coordinates
  const flattened = [];

  // Recursively flatten the coordinates
  function flatten(arr) {
    for (let i = 0; i < arr.length; i++) {
      if (Array.isArray(arr[i][0])) {
        flatten(arr[i]);
      } else {
        flattened.push(arr[i]);
      }
    }
  }

  flatten(coordinates);

  return flattened;
}

async function saveOrUpdateProvinceStatistics(provinceEarthquakeCounts) {
  // Iterate over the province earthquake counts and save or update them in the database
  for (const [province, count] of Object.entries(provinceEarthquakeCounts)) {
    // Try to find existing province statistic document
    let provinceStatistic = await ProvinceStatistic.findOne({ province });

    if (provinceStatistic) {
      // Update existing document
      provinceStatistic.earthquakeCount = count;
      await provinceStatistic.save();
    } else {
      // Create new document
      await ProvinceStatistic.create({ province, earthquakeCount: count });
    }
  }
}

async function getProvinceStatistics() {
  // Fetch province earthquake counts from the database
  const provinceStatistics = await ProvinceStatistic.find({});

  // Convert province statistics to an object with province names as keys
  const provinceEarthquakeCounts = {};
  provinceStatistics.forEach((statistic) => {
    provinceEarthquakeCounts[statistic.province] = statistic.earthquakeCount;
  });

  return provinceEarthquakeCounts;
}

module.exports = getProvinceStatistic;
