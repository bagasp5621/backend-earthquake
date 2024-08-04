const Earthquake = require("../../models/earthquakeModel");

const calculateRiskLevel = (riskCounts) => {
  if (riskCounts.danger >= 6) return "Very High";
  else if (riskCounts.high >= 12) return "High";
  else if (riskCounts.medium >= 24) return "Medium";
  else if (riskCounts.small >= 48) return "Small";
  else return "Safe";
};

const getEarthquakeRiskByLatLng = async (req, res, next) => {
  try {
    const { latitude, longitude, includeEarthquakes } = req.query;
    // Define the radius
    let radius = 300;
    // Convert latitude and longitude to radians
    const userLatRad = parseFloat(latitude) * (Math.PI / 180);
    const userLngRad = parseFloat(longitude) * (Math.PI / 180);
    // Earth radius in kilometers
    const earthRadius = 6371;
    // Calculate the distance in radians for the given radius
    const distanceRadius = radius / earthRadius;
    // Convert distance radius from radians to degrees for bounding box
    const distanceRadiusDegrees = distanceRadius * (180 / Math.PI);
    // Find earthquakes within the bounding box
    const earthquakes = await Earthquake.find({
      latitude: {
        $gte: parseFloat(latitude) - distanceRadiusDegrees,
        $lte: parseFloat(latitude) + distanceRadiusDegrees,
      },
      longitude: {
        $gte: parseFloat(longitude) - distanceRadiusDegrees,
        $lte: parseFloat(longitude) + distanceRadiusDegrees,
      },
    });

    // Filter earthquakes within the actual distance using the Haversine formula
    const nearbyEarthquakes = earthquakes.filter((earthquake) => {
      const eqLatRad = earthquake.latitude * (Math.PI / 180);
      const eqLngRad = earthquake.longitude * (Math.PI / 180);
      const dLat = eqLatRad - userLatRad;
      const dLng = eqLngRad - userLngRad;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(userLatRad) * Math.cos(eqLatRad) * Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = earthRadius * c;

      // Change radius based on label
      switch (earthquake.cluster_label) {
        case 15:
          radius = 200;
          break;
        case 14:
        case 13:
          radius = 100;
          break;
        case 12:
        case 11:
        case 10:
        case 9:
          radius = 50;
          break;
        default:
          radius = 20;
          break;
      }

      return distance <= radius;
    });

    let dangerScore = { small: 0, medium: 0, high: 0, danger: 0 };

    nearbyEarthquakes.map((earthquake) => {
      switch (earthquake.cluster_label) {
        case 15:
          dangerScore.danger++;
          break;
        case 14:
        case 13:
          dangerScore.high++;
          break;
        case 12:
        case 11:
        case 10:
        case 9:
          dangerScore.medium++;
          break;
        default:
          dangerScore.small++;
          break;
      }
    });

    const risk = calculateRiskLevel(dangerScore);

    if (includeEarthquakes) {
      res.json({
        risk,
        count: nearbyEarthquakes.length,
        dangerScore,
        earthquakes: nearbyEarthquakes,
      });
    }

    res.json({
      risk,
      count: nearbyEarthquakes.length,
      dangerScore,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getEarthquakeRiskByLatLng;
