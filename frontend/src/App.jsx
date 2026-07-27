import { useState } from "react";
import axios from "axios";

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a CSV file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);

      const response = await axios.post(
        "http://127.0.0.1:8000/predict-csv",
        formData
      );

      setResult(response.data);
    } catch (error) {
      console.error(error);
      alert("Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "30px",
        fontFamily: "Arial",
        textAlign: "center",
      }}
    >
      <h1>⚡ Electricity Theft Detection System</h1>

      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br />
      <br />

      <button onClick={handleUpload}>
        Upload & Predict
      </button>

      {loading && <h3>Processing...</h3>}

      {result && (
        <div
          style={{
            marginTop: "30px",
            border: "1px solid #ccc",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <h2>Results</h2>

          <h3>
            Total Consumers: {result.total_consumers}
          </h3>

          <h3>
            Theft Cases: {result.theft_cases}
          </h3>

          <h3>
            Normal Consumers: {result.normal_consumers}
          </h3>
        </div>
      )}
    </div>
  );
}

export default App;