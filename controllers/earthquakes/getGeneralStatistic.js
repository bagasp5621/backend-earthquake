const Earthquake = require("../../models/earthquakeModel");
const axios = require("axios");

const getGeneralStatistic = async (req, res, next) => {
  try {
    // Initialize an array to store the general statistics for each label
    let generalStatistics = [];

    const summary = await getEarthquakeSummary();

    for (let label = 1; label <= 15; label++) {
      // Fetch earthquakes for the current label from the database
      const earthquakes = await Earthquake.aggregate([
        {
          $match: { cluster_label: label }, // Filter earthquakes with current label
        },
        {
          $group: {
            _id: "$cluster_label",
            totalEarthquakes: { $sum: 1 },
            averageMagnitude: { $avg: "$magnitude" },
            maxMagnitude: { $max: "$magnitude" },
            minMagnitude: { $min: "$magnitude" },
            averageDepth: { $avg: "$depth" },
            maxDepth: { $max: "$depth" },
            minDepth: { $min: "$depth" },
          },
        },
      ]);

      // Store the statistics for the current label in an object
      const labelStatistics = {
        label,
        statistics: earthquakes[0],
      };
      // Push the statistics object into the generalStatistics array
      generalStatistics.push(labelStatistics);
    }

    res.status(200).json({
      message: "General Statistics",
      summary,
      data: generalStatistics,
    });
  } catch (error) {
    next(error);
  }
};

const trimMultipleDecimals = (number) => {
  return parseFloat(number.toFixed(2));
};

async function getEarthquakeSummary() {
  const totalEarthquakes = await Earthquake.countDocuments();

  const largestCluster = await Earthquake.aggregate([
    { $group: { _id: null, maxCluster: { $max: "$cluster_label" } } },
  ]);
  const largestClusterLabel = largestCluster[0].maxCluster;

  const smallestEpoch = await Earthquake.findOne(
    {},
    {},
    { sort: { datetime: 1 } }
  );
  const largestEpoch = await Earthquake.findOne(
    {},
    {},
    { sort: { datetime: -1 } }
  );

  const totalMilliseconds = largestEpoch.datetime - smallestEpoch.datetime;
  const totalYears = Math.round(
    totalMilliseconds / (1000 * 60 * 60 * 24 * 365)
  );

  const formatDate = (epoch, withTime) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const date = new Date(epoch);
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    if (withTime) {
      return `${month} ${day}, ${year}, ${hours}:${minutes}:${seconds}`;
    } else {
      return `${month} ${day}, ${year}`;
    }
  };

  const largestMagnitudeEarthquake = await Earthquake.findOne(
    {},
    {},
    { sort: { magnitude: -1 } }
  );

  const location = await getLocation(
    largestMagnitudeEarthquake.latitude,
    largestMagnitudeEarthquake.longitude
  );

  return {
    totalEarthquakes,
    largestCluster: largestClusterLabel,
    totalYears: {
      years: totalYears,
      firstData: formatDate(smallestEpoch.datetime),
      lastData: formatDate(largestEpoch.datetime),
    },
    largestEarthquake: {
      magnitude: trimMultipleDecimals(largestMagnitudeEarthquake.magnitude),
      latitude: largestMagnitudeEarthquake.latitude,
      longitude: largestMagnitudeEarthquake.longitude,
      location,
      datetime: formatDate(largestMagnitudeEarthquake.datetime, true),
    },
  };
}

async function getLocation(latitude, longitude) {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    );

    if (response.data && response.data.display_name) {
      const address = response.data.display_name;
      return address;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error:", error.message);
    return null;
  }
}

module.exports = getGeneralStatistic;
