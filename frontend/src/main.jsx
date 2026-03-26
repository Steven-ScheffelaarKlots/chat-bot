/**
 * ENTRY POINT
 *
 * This is where React starts. It finds the <div id="root"> in index.html
 * and "mounts" the App component into it. From this point on, React controls
 * everything inside that div.
 *
 * React.StrictMode wraps the app during development only. It intentionally
 * double-invokes certain lifecycle functions to help you catch bugs early.
 * It has no effect in production builds.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
