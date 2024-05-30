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
    const { latitude, longitude, includeEarthquakess } = req.query;
    const radius = req.query.radius || 100; // Default radius of 50 units if not provided in the query

    // Convert latitude and longitude to radians
    const userLatRad = parseFloat(latitude) * (Math.PI / 180);
    const userLngRad = parseFloat(longitude) * (Math.PI / 180);

    // Earth radius in kilometers
    const earthRadius = 6371;

    // Calculate the distance in radians for the given radius
    const distanceRadius = radius / earthRadius;

    // Find earthquakes within the distance radius
    const earthquakes = await Earthquake.find({
      latitude: {
        $gte: parseFloat(latitude) - (180 / Math.PI) * distanceRadius,
        $lte: parseFloat(latitude) + (180 / Math.PI) * distanceRadius,
      },
      longitude: {
        $gte: parseFloat(longitude) - (180 / Math.PI) * distanceRadius,
        $lte: parseFloat(longitude) + (180 / Math.PI) * distanceRadius,
      },
    });

    // Filter earthquakes within the actual distance using the Haversine formula
    const nearbyEarthquakes = earthquakes.filter((earthquake) => {
      const eqLatRad = earthquake.latitude * (Math.PI / 180);
      const eqLngRad = earthquake.longitude * (Math.PI / 180);
      const dLat = eqLatRad - userLatRad;
      const dLng = eqLngRad - userLngRad;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(userLatRad) *
          Math.cos(eqLatRad) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = earthRadius * c;
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

    if (includeEarthquakess) {
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
