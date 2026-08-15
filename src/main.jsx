import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "../src/app/App";
import "./index.css";
import { AuthProvider } from "../src/auth/AuthContext";
import ErrorBoundary from "../src/ui/ErrorBoundary";
import { installSweetAlerts } from "../src/ui/sweetAlerts";

installSweetAlerts();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
