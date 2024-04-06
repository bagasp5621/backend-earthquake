const geolib = require("geolib");
const Earthquake = require("../models/earthquakeModel");

exports.getEarthquakeRiskByLatLng = async (req, res, next) => {
  try {
    const { latitude, longitude, includeEarthquakes } = req.query;
    const radius = req.query.radius || 50; // Default radius of 50 units if not provided in the query

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

    let dangerScore = { kecil: 0, sedang: 0, tinggi: 0, berbahaya: 0 };

    nearbyEarthquakes.map((earthquake) => {
      switch (earthquake.cluster_label) {
        case 15:
          dangerScore.berbahaya++;
          break;
        case 14:
        case 13:
          dangerScore.tinggi++;
          break;
        case 12:
        case 11:
        case 10:
        case 9:
          dangerScore.sedang++;
          break;
        default:
          dangerScore.kecil++;
          break;
      }
    });

    if (includeEarthquakes) {
      res.json({
        count: nearbyEarthquakes.length,
        dangerScore,
        earthquakes: nearbyEarthquakes,
      });
    }

    res.json({
      count: nearbyEarthquakes.length,
      dangerScore,
    });
  } catch (error) {
    next(error);
  }
};

exports.getEarthquakePolygon = async (req, res, next) => {
  const { radius, minLength } = req.query;

  try {
    // Fetch on cluster label 15
    const earthquakes = await Earthquake.find({
      cluster_label: 15,
    }).select("latitude longitude magnitude");

    // Initialize an array to store clusters
    const clusters = [];

    let defaultRadius = 300000;
    // check if radius is exist, if yes replace the default radius
    if (radius) {
      defaultRadius = parseInt(radius);
    }

    // Iterate over earthquakes
    earthquakes.forEach((earthquake) => {
      // Flag to indicate if the earthquake is assigned to any existing cluster
      let assigned = false;

      // Iterate over existing clusters to check if the earthquake can be assigned to any
      clusters.forEach((cluster) => {
        // Calculate distance between the earthquake and the centroid of the cluster
        const distance = geolib.getDistance(
          { latitude: earthquake.latitude, longitude: earthquake.longitude },
          {
            latitude: cluster.centroid.latitude,
            longitude: cluster.centroid.longitude,
          }
        );

        // If the distance is within the threshold, assign the earthquake to the cluster
        if (distance <= defaultRadius) {
          // 300km converted to meters
          cluster.earthquakes.push(earthquake);
          assigned = true;
        }
      });

      // If the earthquake is not assigned to any existing cluster, create a new cluster
      if (!assigned) {
        clusters.push({
          centroid: {
            latitude: earthquake.latitude,
            longitude: earthquake.longitude,
          },
          earthquakes: [earthquake],
        });
      }
    });
    // Filter out clusters containing less than 3 earthquakes or defined length
    const earthquakeMinLength = minLength ? parseInt(minLength) : 3;
    const filteredClusters = clusters.filter(
      (cluster) => cluster.earthquakes.length >= earthquakeMinLength
    );

    res.send({
      message: "Earthquakes clustered successfully",
      clusters: filteredClusters,
    });
  } catch (error) {
    next(error);
  }
};
