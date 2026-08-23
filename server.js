const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "Shiprocket test"
  });
});

app.post("/test", async (req, res) => {
  try {
    const response = await fetch(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: process.env.SHIPROCKET_EMAIL,
          password: process.env.SHIPROCKET_PASSWORD
        })
      }
    );

    const text = await response.text();

    res.status(response.status).send(text);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.listen(process.env.PORT || 3000, "0.0.0.0");
