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
// SHIPROCKET LOGIN
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
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `Shiprocket login failed (${response.status}): ${JSON.stringify(data)}`
    );
  }

  if (!data.token) {
    throw new Error("Shiprocket token not received");
  }

  return data.token;
}


// =====================================================
// TEST LOGIN
// =====================================================

app.post("/test", async (req, res) => {
  try {
    const token = await getShiprocketToken();

    res.json({
      success: true,
      message: "Shiprocket login successful",
      token_received: !!token
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// =====================================================
// NORMAL DOMESTIC RATE
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

    const weight = Number(req.body.weight);

    const cod = Number(req.body.cod || 0);

    if (
      !pickup ||
      !drop ||
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "pickup_pincode, drop_pincode and weight are required"
      });
    }

    const token = await getShiprocketToken();

    const url =
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability/" +
      `?pickup_postcode=${encodeURIComponent(pickup)}` +
      `&delivery_postcode=${encodeURIComponent(drop)}` +
      `&weight=${encodeURIComponent(weight)}` +
      `&cod=${encodeURIComponent(cod)}`;

    console.log("DOMESTIC RATE URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.status(response.status).json(data);

  } catch (error) {

    console.error("RATE ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// =====================================================
// HYPERLOCAL / QUICK RATE
// =====================================================

app.post("/quick-rate", async (req, res) => {
  try {

    console.log("QUICK RATE REQUEST:", req.body);

    const pickup = String(
      req.body.pickup_pincode || ""
    ).trim();

    const drop = String(
      req.body.drop_pincode || ""
    ).trim();

    const weight = Number(req.body.weight);

    const cod = Number(req.body.cod || 0);

    const latFrom = Number(req.body.lat_from);
    const longFrom = Number(req.body.long_from);

    const latTo = Number(req.body.lat_to);
    const longTo = Number(req.body.long_to);

    if (
      !pickup ||
      !drop ||
      !Number.isFinite(weight) ||
      weight <= 0 ||
      !Number.isFinite(latFrom) ||
      !Number.isFinite(longFrom) ||
      !Number.isFinite(latTo) ||
      !Number.isFinite(longTo)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "pickup_pincode, drop_pincode, weight, lat_from, long_from, lat_to and long_to are required"
      });
    }

    const token = await getShiprocketToken();

    const url =
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability/" +
      `?pickup_postcode=${encodeURIComponent(pickup)}` +
      `&delivery_postcode=${encodeURIComponent(drop)}` +
      `&weight=${encodeURIComponent(weight)}` +
      `&cod=${encodeURIComponent(cod)}` +
      `&is_new_hyperlocal=1` +
      `&lat_from=${encodeURIComponent(latFrom)}` +
      `&long_from=${encodeURIComponent(longFrom)}` +
      `&lat_to=${encodeURIComponent(latTo)}` +
      `&long_to=${encodeURIComponent(longTo)}`;

    console.log("QUICK RATE URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.status(response.status).json(data);

  } catch (error) {

    console.error("QUICK RATE ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// =====================================================
// INTERNATIONAL RATE
// =====================================================

app.post("/international/rates", async (req, res) => {

  try {

    console.log(
      "================================================="
    );

    console.log(
      "INTERNATIONAL RATE REQUEST:"
    );

    console.log(
      JSON.stringify(req.body, null, 2)
    );


    // -------------------------------------------------
    // INPUT
    // -------------------------------------------------

    const body = req.body;

    const sender = body.sender || {};
    const receiver = body.receiver || {};
    const pkg = body.package || {};
    const exportData = body.export || {};


    // -------------------------------------------------
    // BASIC VALIDATION
    // -------------------------------------------------

    if (!sender.pincode) {
      return res.status(400).json({
        success: false,
        message: "sender.pincode is required"
      });
    }

    if (!receiver.pincode) {
      return res.status(400).json({
        success: false,
        message: "receiver.pincode is required"
      });
    }

    if (!receiver.country) {
      return res.status(400).json({
        success: false,
        message: "receiver.country is required"
      });
    }

    if (!pkg.weight) {
      return res.status(400).json({
        success: false,
        message: "package.weight is required"
      });
    }


    // -------------------------------------------------
    // SHIPROCKET LOGIN
    // -------------------------------------------------

    const token = await getShiprocketToken();

    console.log(
      "SHIPROCKET INTERNATIONAL LOGIN: SUCCESS"
    );


    // -------------------------------------------------
    // INTERNATIONAL RATE
    // -------------------------------------------------

    const rateUrl =
      "https://apiv2.shiprocket.in/v1/external/international/courier/serviceability";


    // -------------------------------------------------
    // INTERNATIONAL QUERY
    // -------------------------------------------------

    const query = new URLSearchParams({
      pickup_postcode: String(sender.pincode),

      delivery_postcode: String(receiver.pincode),

      delivery_country: String(receiver.country),

      weight: String(pkg.weight),

      cod: "0",

      length: String(pkg.length || 0),

      breadth: String(pkg.breadth || 0),

      height: String(pkg.height || 0)
    });


    const finalUrl =
      `${rateUrl}?${query.toString()}`;


    console.log(
      "INTERNATIONAL RATE URL:",
      finalUrl
    );


    // -------------------------------------------------
    // CALL SHIPROCKET
    // -------------------------------------------------

    const response = await fetch(
      finalUrl,
      {
        method: "GET",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      }
    );


    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    const text =
      await response.text();


    console.log(
      "SHIPROCKET INTERNATIONAL RESPONSE:",
      text
    );


    let data;


    try {

      data = JSON.parse(text);

    } catch {

      data = {
        raw: text
      };

    }


    return res
      .status(response.status)
      .json(data);


  } catch (error) {

    console.error(
      "INTERNATIONAL RATE ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      error: error.message

    });

  }

});


// =====================================================
// INTERNATIONAL ORDER CREATE
// =====================================================

app.post("/international/order", async (req, res) => {

  try {

    console.log(
      "INTERNATIONAL ORDER REQUEST:",
      JSON.stringify(req.body, null, 2)
    );


    const token =
      await getShiprocketToken();


    const response =
      await fetch(
        "https://apiv2.shiprocket.in/v1/external/international/orders/create/adhoc",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },

          body: JSON.stringify(req.body)
        }
      );


    const text =
      await response.text();


    let data;


    try {

      data =
        JSON.parse(text);

    } catch {

      data = {
        raw: text
      };

    }


    console.log(
      "SHIPROCKET INTERNATIONAL ORDER RESPONSE:",
      data
    );


    return res
      .status(response.status)
      .json(data);


  } catch (error) {

    console.error(
      "INTERNATIONAL ORDER ERROR:",
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
