const Earthquake = require("../../models/earthquakeModel");

const getGeneralStatistic = async (req, res, next) => {
  try {
    // Initialize an array to store the general statistics for each label
    let generalStatistics = [];

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
      data: generalStatistics,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getGeneralStatistic;
