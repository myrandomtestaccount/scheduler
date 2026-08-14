import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./App.css";

const rootElement = document.querySelector("#react-root");

if (!rootElement) {
  throw new Error("Missing React root element.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
