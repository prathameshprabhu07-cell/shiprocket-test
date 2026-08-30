```javascript
const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "Shiprocket proxy"
  });
});

// LOGIN TEST
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


// =====================================================
// NORMAL COURIER RATE CHECK
// =====================================================

app.post("/rate", async (req, res) => {
  try {

    console.log("RATE REQUEST:", req.body);

    const pickup = String(req.body.pickup_pincode || "").trim();
    const drop = String(req.body.drop_pincode || "").trim();
    const parcelWeight = Number(req.body.weight);
    const codAmount = Number(req.body.cod || 0);

    console.log("PARSED:", {
      pickup,
      drop,
      parcelWeight,
      codAmount
    });

    if (
      !pickup ||
      !drop ||
      !Number.isFinite(parcelWeight) ||
      parcelWeight <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "pickup_pincode, drop_pincode and weight are required",
        received: {
          pickup_pincode: req.body.pickup_pincode,
          drop_pincode: req.body.drop_pincode,
          weight: req.body.weight
        }
      });
    }

    // LOGIN
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
      return res.status(loginResponse.status).json(loginData);
    }

    const token = loginData.token;

    console.log("SHIPROCKET LOGIN: SUCCESS");

    // RATE URL
    const rateUrl =
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability/" +
      `?pickup_postcode=${encodeURIComponent(pickup)}` +
      `&delivery_postcode=${encodeURIComponent(drop)}` +
      `&weight=${encodeURIComponent(parcelWeight)}` +
      `&cod=${encodeURIComponent(codAmount)}`;

    console.log("RATE URL:", rateUrl);

    // RATE API
    const rateResponse = await fetch(rateUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const rateText = await rateResponse.text();

    console.log("SHIPROCKET RESPONSE:", rateText);

    let rateData;

    try {
      rateData = JSON.parse(rateText);
    } catch {
      rateData = {
        raw: rateText
      };
    }

    return res.status(rateResponse.status).json(rateData);

  } catch (error) {

    console.error("RATE ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// =====================================================
// QUICK DELIVERY / HYPERLOCAL SERVICEABILITY
// =====================================================

app.post("/quick-rate", async (req, res) => {
  try {

    console.log("QUICK RATE REQUEST:", req.body);

    const pickup = String(req.body.pickup_pincode || "").trim();
    const drop = String(req.body.drop_pincode || "").trim();

    const parcelWeight = Number(req.body.weight);
    const cod = Number(req.body.cod || 0);

    const latFrom = Number(req.body.lat_from);
    const longFrom = Number(req.body.long_from);

    const latTo = Number(req.body.lat_to);
    const longTo = Number(req.body.long_to);

    console.log("QUICK PARSED:", {
      pickup,
      drop,
      parcelWeight,
      cod,
      latFrom,
      longFrom,
      latTo,
      longTo
    });

    // VALIDATION
    if (
      !pickup ||
      !drop ||
      !Number.isFinite(parcelWeight) ||
      parcelWeight <= 0 ||
      !Number.isFinite(latFrom) ||
      !Number.isFinite(longFrom) ||
      !Number.isFinite(latTo) ||
      !Number.isFinite(longTo)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "pickup_pincode, drop_pincode, weight, lat_from, long_from, lat_to and long_to are required",
        received: req.body
      });
    }


    // LOGIN
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

      console.error("QUICK LOGIN ERROR:", loginData);

      return res.status(loginResponse.status).json(loginData);
    }

    const token = loginData.token;

    console.log("SHIPROCKET QUICK LOGIN: SUCCESS");


    // QUICK / HYPERLOCAL SERVICEABILITY
    const quickUrl =
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability/";

    const quickBody = {
      pickup_postcode: Number(pickup),
      delivery_postcode: Number(drop),
      cod: cod,
      weight: parcelWeight,

      // IMPORTANT
      is_new_hyperlocal: 1,

      lat_from: latFrom,
      long_from: longFrom,
      lat_to: latTo,
      long_to: longTo
    };

    console.log("QUICK BODY:", quickBody);


    // SHIPROCKET API
    const quickResponse = await fetch(quickUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(quickBody)
    });

    const quickText = await quickResponse.text();

    console.log("SHIPROCKET QUICK RESPONSE:", quickText);

    let quickData;

    try {
      quickData = JSON.parse(quickText);
    } catch {
      quickData = {
        raw: quickText
      };
    }


    // RETURN RESPONSE
    return res.status(quickResponse.status).json(quickData);

  } catch (error) {

    console.error("QUICK RATE ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// =====================================================
// SERVER
// =====================================================

app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("Shiprocket proxy running");
});
```
