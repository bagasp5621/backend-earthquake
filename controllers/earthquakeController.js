const geolib = require("geolib");
const Earthquake = require("../models/earthquakeModel");

exports.getEarthquakeRiskByLatLng = async (req, res, next) => {
  try {
    const { latitude, longitude, includeEarthquakess } = req.query;
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

    if (includeEarthquakess) {
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
  const { radius, minLength, includeEarthquakes } = req.query;

  try {
    // Fetch earthquakes with cluster label 15
    const earthquakes = await Earthquake.find({
      cluster_label: 15,
    }).select("latitude longitude magnitude");

    // Cluster earthquakes
    const clusters = clusterEarthquakes(earthquakes, radius);

    // Add total earthquakes count to each cluster
    addTotalEarthquakes(clusters);

    // Remove earthquake data if includeEarthquakes is false
    if (!includeEarthquakes) {
      removeEarthquakeData(clusters);
    }

    // Filter out clusters with less than minLength earthquakes
    const filteredClusters = filterClusters(clusters, minLength);

    // Send response
    res.send({
      message: "Earthquakes clustered successfully",
      clusters: filteredClusters,
    });
  } catch (error) {
    next(error);
  }
};

// Function to create a new cluster
function createCluster(earthquake) {
  return {
    centroid: {
      latitude: earthquake.latitude,
      longitude: earthquake.longitude,
    },
    earthquakes: [earthquake],
  };
}
// Function to update an existing cluster with a new earthquake
function updateCluster(cluster, earthquake) {
  const totalLatitude =
    cluster.earthquakes.reduce((sum, eq) => sum + eq.latitude, 0) +
    earthquake.latitude;
  const totalLongitude =
    cluster.earthquakes.reduce((sum, eq) => sum + eq.longitude, 0) +
    earthquake.longitude;
  cluster.centroid.latitude = totalLatitude / (cluster.earthquakes.length + 1);
  cluster.centroid.longitude =
    totalLongitude / (cluster.earthquakes.length + 1);
  cluster.earthquakes.push(earthquake);
}
// Function to add total earthquakes count to each cluster
function addTotalEarthquakes(clusters) {
  clusters.forEach((cluster) => {
    cluster.totalEarthquakes = cluster.earthquakes.length;
  });
}
// Function to remove earthquake data from clusters if includeEarthquakes is false
function removeEarthquakeData(clusters) {
  clusters.forEach((cluster) => {
    delete cluster.earthquakes;
  });
}
// Function to filter clusters based on minimum length
function filterClusters(clusters, minLength) {
  const earthquakeMinLength = minLength ? parseInt(minLength) : 4;
  return clusters.filter(
    (cluster) =>
      cluster.earthquakes && cluster.earthquakes.length >= earthquakeMinLength
  );
}
// Function to cluster earthquakes
function clusterEarthquakes(earthquakes, radius) {
  const clusters = [];
  let defaultRadius = 300000;

  // Set default radius if provided
  if (radius) {
    defaultRadius = parseInt(radius);
  }

  // Iterate over earthquakes to cluster them
  earthquakes.forEach((earthquake) => {
    let assigned = false;

    // If no clusters exist, create a new cluster with the current earthquake
    if (clusters.length === 0) {
      clusters.push(createCluster(earthquake));
      return;
    }

    // Iterate over existing clusters to assign the earthquake to a cluster
    for (const cluster of clusters) {
      const distance = geolib.getDistance(
        { latitude: earthquake.latitude, longitude: earthquake.longitude },
        cluster.centroid
      );

      // If the earthquake is within the threshold distance, assign it to the cluster
      if (distance <= defaultRadius) {
        updateCluster(cluster, earthquake);
        assigned = true;
        break;
      }
    }

    // If the earthquake is not assigned to any existing cluster, create a new cluster
    if (!assigned) {
      clusters.push(createCluster(earthquake));
    }
  });

  return clusters;
}
