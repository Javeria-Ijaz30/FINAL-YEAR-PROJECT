import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "./index.css";
import App from "./App.jsx";
import { AppProvider } from "./Context/AppContext.jsx";
import { LoadScript } from "@react-google-maps/api";

const googleMapsApiKey = "AIzaSyB-ixsqP_juZ1wBEHU7X4K5ew7k2-FVidQ";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LoadScript googleMapsApiKey={googleMapsApiKey} libraries={["places"]}>
      <AppProvider>  {/* Ensure this is uncommented */}
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <ToastContainer />
      </AppProvider>
    </LoadScript>
  </StrictMode>
);
