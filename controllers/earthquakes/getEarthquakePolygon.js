const geolib = require("geolib");
const Earthquake = require("../../models/earthquakeModel");

const getEarthquakePolygon = async (req, res, next) => {
  const { radius, minLength, includeEarthquakes } = req.query;

  try {
    // Fetch earthquakes with cluster label 15
    const earthquakes = await Earthquake.find({
      cluster_label: { $in: [15] },
    }).select("latitude longitude magnitude depth");

    // Cluster earthquakes
    const clusters = clusterEarthquakes(earthquakes, radius);

    // Filter out clusters with less than minLength earthquakes
    const filteredClusters = filterClusters(clusters, minLength);

    // Add total earthquakes count to each cluster
    addTotalEarthquakes(filteredClusters);

    // Remove earthquake data if includeEarthquakes is false
    if (!includeEarthquakes) {
      removeEarthquakeData(filteredClusters);
    }

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
  let avgMag = 0;
  let avgDepth = 0;
  clusters.forEach((cluster) => {
    cluster.totalEarthquakes = cluster.earthquakes.forEach((eq) => {
      avgMag += eq.magnitude;
      avgDepth += eq.depth;
    });
    cluster.totalEarthquakes = cluster.earthquakes.length;
    cluster.avgMag = avgMag / cluster.totalEarthquakes;
    cluster.avgDepth = avgDepth / cluster.totalEarthquakes;
    avgMag = 0;
    avgDepth = 0;
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

module.exports = getEarthquakePolygon;
