const Earthquake = require("../../models/earthquakeModel");

const filterEarthquake = async (req, res, next) => {
  let {
    north,
    south,
    east,
    west,
    startDate,
    endDate,
    minMag,
    maxMag,
    minDepth,
    maxDepth,
  } = req.query;

  try {
    // Constructing the filter object
    const filter = {};

    // Latitude and Longitude bounds
    if (north && south && east && west) {
      filter.latitude = { $gte: parseFloat(south), $lte: parseFloat(north) };
      filter.longitude = { $gte: parseFloat(west), $lte: parseFloat(east) };
    }

    // Date range (if startDate and endDate provided)
    if (startDate && endDate) {
      const startTimestamp = parseInt(startDate);
      const endTimestamp = parseInt(endDate);
      const maxStartTimestamp = endTimestamp - 31 * 24 * 60 * 60 * 1000; // 31 days in miliseconds

      // Adjust startDate if it's more than 31 days behind endDate
      const adjustedStartDate =
        startTimestamp < maxStartTimestamp ? maxStartTimestamp : startTimestamp;

      filter.datetime = {
        $gte: adjustedStartDate,
        $lte: endTimestamp,
      };
    }

    // Magnitude range
    if (minMag && maxMag) {
      filter.magnitude = { $gte: parseFloat(minMag), $lte: parseFloat(maxMag) };
    }

    // Depth range
    if (minDepth && maxDepth) {
      filter.depth = { $gte: parseFloat(minDepth), $lte: parseFloat(maxDepth) };
    }

    if (Object.keys(filter).length === 0) {
      res.status(400).send({
        message: "Missing query parameter",
      });
    }

    const earthquakes = await Earthquake.find(filter);

    // Calculate summary statistics
    const totalEarthquake = earthquakes.length;
    const totalMagnitude = earthquakes.reduce(
      (sum, eq) => sum + eq.magnitude,
      0
    );
    const totalDepth = earthquakes.reduce((sum, eq) => sum + eq.depth, 0);
    const averageMagnitude = parseFloat(
      totalEarthquake > 0 ? (totalMagnitude / totalEarthquake).toFixed(3) : 0
    );
    const averageDepth = parseFloat(
      totalEarthquake > 0 ? (totalDepth / totalEarthquake).toFixed(3) : 0
    );

    res.send({
      message: "Earthquakes Filter Success",
      summary: {
        totalEarthquake,
        averageMagnitude,
        averageDepth,
      },
      data: earthquakes,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = filterEarthquake;
