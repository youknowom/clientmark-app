

import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>

      {/* Back link */}
      <p
        onClick={() => navigate(-1)}
        style={{
          color: "blue",
          textDecoration: "underline",
          cursor: "pointer",
          marginTop: "20px",
        }}
      >
        Back
      </p>
    </div>
  );
};

export default NotFound;
