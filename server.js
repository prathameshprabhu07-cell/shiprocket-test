const express = require("express");

const app = express();

app.use(express.json());


// =====================================================
// HOME / HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "Shiprocket proxy"
  });
});


// =====================================================
// SHIPROCKET LOGIN HELPER
// =====================================================

async function getShiprocketToken() {
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

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = {
      raw: text
    };
  }

  if (!response.ok) {
    throw new Error(
      `Shiprocket login failed (${response.status}): ${JSON.stringify(data)}`
    );
  }

  if (!data.token) {
    throw new Error("Shiprocket login succeeded but token was not returned");
  }

  return data.token;
}


// =====================================================
// LOGIN TEST
// =====================================================

app.post("/test", async (req, res) => {
  try {
    const token = await getShiprocketToken();

    return res.json({
      success: true,
      message: "Shiprocket login successful",
      token_received: !!token
    });

  } catch (error) {

    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
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

    const pickup = String(
      req.body.pickup_pincode || ""
    ).trim();

    const drop = String(
      req.body.drop_pincode || ""
    ).trim();

    const parcelWeight = Number(req.body.weight);

    const codAmount = Number(
      req.body.cod || 0
    );


    console.log("PARSED:", {
      pickup,
      drop,
      parcelWeight,
      codAmount
    });


    // VALIDATION

    if (
      !pickup ||
      !drop ||
      !Number.isFinite(parcelWeight) ||
      parcelWeight <= 0
    ) {

      return res.status(400).json({
        success: false,
        message:
          "pickup_pincode, drop_pincode and weight are required",
        received: {
          pickup_pincode: req.body.pickup_pincode,
          drop_pincode: req.body.drop_pincode,
          weight: req.body.weight
        }
      });

    }


    // LOGIN

    const token = await getShiprocketToken();

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


    console.log(
      "SHIPROCKET RESPONSE:",
      rateText
    );


    let rateData;

    try {

      rateData = JSON.parse(rateText);

    } catch {

      rateData = {
        raw: rateText
      };

    }


    return res
      .status(rateResponse.status)
      .json(rateData);


  } catch (error) {

    console.error("RATE ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message
    });

  }
});


// =====================================================
// QUICK DELIVERY / HYPERLOCAL RATE
// =====================================================

app.post("/quick-rate", async (req, res) => {

  try {

    console.log(
      "QUICK RATE REQUEST:",
      req.body
    );


    // -------------------------------------------------
    // INPUTS
    // -------------------------------------------------

    const pickup = String(
      req.body.pickup_pincode || ""
    ).trim();

    const drop = String(
      req.body.drop_pincode || ""
    ).trim();

    const parcelWeight = Number(
      req.body.weight
    );

    const cod = Number(
      req.body.cod || 0
    );


    const latFrom = Number(
      req.body.lat_from
    );

    const longFrom = Number(
      req.body.long_from
    );

    const latTo = Number(
      req.body.lat_to
    );

    const longTo = Number(
      req.body.long_to
    );


    console.log(
      "QUICK PARSED:",
      {
        pickup,
        drop,
        parcelWeight,
        cod,
        latFrom,
        longFrom,
        latTo,
        longTo
      }
    );


    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

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


    // -------------------------------------------------
    // LOGIN
    // -------------------------------------------------

    const token = await getShiprocketToken();

    console.log(
      "SHIPROCKET QUICK LOGIN: SUCCESS"
    );


    // -------------------------------------------------
    // HYPERLOCAL SERVICEABILITY
    // -------------------------------------------------

    const quickUrl =
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability/" +
      `?pickup_postcode=${encodeURIComponent(pickup)}` +
      `&delivery_postcode=${encodeURIComponent(drop)}` +
      `&weight=${encodeURIComponent(parcelWeight)}` +
      `&cod=${encodeURIComponent(cod)}` +
      `&is_new_hyperlocal=1` +
      `&lat_from=${encodeURIComponent(latFrom)}` +
      `&long_from=${encodeURIComponent(longFrom)}` +
      `&lat_to=${encodeURIComponent(latTo)}` +
      `&long_to=${encodeURIComponent(longTo)}`;


    console.log(
      "QUICK URL:",
      quickUrl
    );


    // -------------------------------------------------
    // SHIPROCKET API
    // -------------------------------------------------

    const quickResponse = await fetch(
      quickUrl,
      {
        method: "GET",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      }
    );


    const quickText =
      await quickResponse.text();


    console.log(
      "SHIPROCKET QUICK RESPONSE:",
      quickText
    );


    let quickData;


    try {

      quickData =
        JSON.parse(quickText);

    } catch {

      quickData = {
        raw: quickText
      };

    }


    // -------------------------------------------------
    // OPTIONAL QUICK FILTER
    // -------------------------------------------------

    if (
      quickData &&
      Array.isArray(quickData.data)
    ) {

      quickData.quick_couriers =
        quickData.data.filter(
          courier => {

            const name =
              String(
                courier.courier_name || ""
              ).toLowerCase();

            return (
              name.includes("quick") ||
              name.includes("rush") ||
              name.includes("same day") ||
              name.includes("sdd") ||
              name.includes("ndd")
            );

          }
        );

    }


    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res
      .status(quickResponse.status)
      .json(quickData);


  } catch (error) {

    console.error(
      "QUICK RATE ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      error: error.message

    });

  }

});


// =====================================================
// SERVER
// =====================================================

const PORT =
  process.env.PORT || 3000;


app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Shiprocket proxy running on port ${PORT}`
    );

  }
);
