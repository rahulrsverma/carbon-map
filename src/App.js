import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Circle, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import "./App.css";

const customIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const App = () => {
  const [regions, setRegions] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const mapRef = useRef(null);

  const getLast30Minutes = () => {
    const now = new Date();
    const end = now.toISOString();
    const start = new Date(now.getTime() - 30 * 60000).toISOString();
    return { start, end };
  };

  useEffect(() => {
    const fetchData = async () => {
      const { start, end } = getLast30Minutes();

      try {
        const response = await axios.get(
          `https://api.carbonintensity.org.uk/regional/intensity/${start}/${end}`
        );
        const data = response.data.data[0].regions;
        setRegions(data);

        const heatmapPoints = data
          .filter(
            (region) =>
              region.latitude !== undefined &&
              region.longitude !== undefined &&
              region.intensity?.index !== undefined
          )
          .map((region) => [
            region.latitude,
            region.longitude,
            region.intensity.index === "moderate" ? 100 : region.intensity.index === "high" ? 200 : 50,
          ]);
        setHeatmapData(heatmapPoints);
      } catch (error) {
        console.error("Error fetching carbon intensity data:", error);
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = L.map("custom-map").setView([51.505, -0.09], 13);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    L.marker([51.5, -0.09], { icon: customIcon })
      .addTo(mapRef.current)
      .bindPopup("Marker icon.")
      .openPopup();
  }, []);

  const getColor = (intensity) => {
    if (intensity === "moderate") return "green";
    if (intensity === "high") return "blue";
    return "red";
  };

  return (
    <div>
      <h1>Carbon Intensity Map</h1>
      <div
        id="custom-map"
        style={{ height: "400px", width: "100%", marginBottom: "20px" }}
      ></div>
      <MapContainer
        center={[54.5, -2.5]}
        zoom={6}
        style={{ height: "80vh", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {heatmapData.length > 0 && (
          <L.heatLayer
            points={heatmapData}
            max={300}
            radius={25}
            blur={15}
            gradient={{
              0.2: "green",
              0.4: "yellow",
              0.6: "orange",
              0.8: "red",
            }}
          />
        )}
        {regions
          .filter(
            (region) =>
              region.latitude !== undefined &&
              region.longitude !== undefined &&
              region.intensity?.index !== undefined
          )
          .map((region) => (
            <Circle
              key={region.regionid}
              center={[region.latitude, region.longitude]}
              radius={10000}
              color={getColor(region.intensity.index)}
              fillOpacity={0.5}
            >
              <Tooltip>
                <div>
                  <strong>{region.shortname}</strong>
                  <p>Intensity: {region.intensity.index}</p>
                  <p>Timestamp: {region.dataLastUpdated}</p>
                </div>
              </Tooltip>
            </Circle>
          ))}
      </MapContainer>
    </div>
  );
};

export default App;
