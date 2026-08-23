const express = require("express");

const app = express();

app.use(express.json());


// ===============================
// HOME / HEALTH CHECK
// ===============================

app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "Shiprocket proxy"
  });
});


// ===============================
// LOGIN TEST
// ===============================

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
      success: false,
      error: error.message
    });

  }
});


// ===============================
// HYPERLOCAL / RATE CHECK
// ===============================

app.post("/rate", async (req, res) => {

  try {

    const {
      pickup_pincode,
      drop_pincode,
      weight,
      cod = 0
    } = req.body;


    // Validate input

    if (!pickup_pincode || !drop_pincode || !weight) {

      return res.status(400).json({
        success: false,
        message: "pickup_pincode, drop_pincode and weight are required"
      });

    }


    // ===============================
    // LOGIN TO SHIPROCKET
    // ===============================

    const loginResponse = await fetch(
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


    const loginData = await loginResponse.json();


    if (!loginResponse.ok) {

      return res.status(loginResponse.status).json({
        success: false,
        message: "Shiprocket login failed",
        data: loginData
      });

    }


    const token = loginData.token;


    // ===============================
    // RATE API
    // ===============================

    const rateUrl =
      `https://apiv2.shiprocket.in/v1/external/courier/serviceability/` +
      `?pickup_postcode=${encodeURIComponent(pickup_pincode)}` +
      `&delivery_postcode=${encodeURIComponent(drop_pincode)}` +
      `&weight=${encodeURIComponent(weight)}` +
      `&cod=${encodeURIComponent(cod)}` +
      `&only_local=1`;


    const rateResponse = await fetch(rateUrl, {

      method: "GET",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }

    });


    const rateData = await rateResponse.json();


    // ===============================
    // RETURN RATE RESULT
    // ===============================

    return res.status(rateResponse.status).json(rateData);


  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });

  }

});


// ===============================
// START SERVER
// ===============================

app.listen(
  process.env.PORT || 3000,
  "0.0.0.0",
  () => {
    console.log("Shiprocket proxy running");
  }
);
