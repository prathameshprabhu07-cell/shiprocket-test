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
    throw new Error(
      "Shiprocket login succeeded but token was not returned"
    );
  }

  return data.token;
}


// =====================================================
// LOGIN TEST
// =====================================================

app.post("/test", async (req, res) => {

  try {

    const token =
      await getShiprocketToken();

    return res.json({
      success: true,
      message: "Shiprocket login successful",
      token_received: !!token
    });

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

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

    console.log(
      "RATE REQUEST:",
      req.body
    );

    const pickup =
      String(
        req.body.pickup_pincode || ""
      ).trim();

    const drop =
      String(
        req.body.drop_pincode || ""
      ).trim();

    const parcelWeight =
      Number(
        req.body.weight
      );

    const codAmount =
      Number(
        req.body.cod || 0
      );


    if (
      !pickup ||
      !drop ||
      !Number.isFinite(parcelWeight) ||
      parcelWeight <= 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "pickup_pincode, drop_pincode and weight are required"

      });

    }


    const token =
      await getShiprocketToken();


    const rateUrl =
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability/" +
      `?pickup_postcode=${encodeURIComponent(pickup)}` +
      `&delivery_postcode=${encodeURIComponent(drop)}` +
      `&weight=${encodeURIComponent(parcelWeight)}` +
      `&cod=${encodeURIComponent(codAmount)}`;


    console.log(
      "RATE URL:",
      rateUrl
    );


    const rateResponse =
      await fetch(
        rateUrl,
        {
          method: "GET",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${token}`
          }
        }
      );


    const rateText =
      await rateResponse.text();


    let rateData;

    try {

      rateData =
        JSON.parse(rateText);

    } catch {

      rateData = {
        raw: rateText
      };

    }


    return res
      .status(rateResponse.status)
      .json(rateData);


  } catch (error) {

    console.error(
      "RATE ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      error:
        error.message

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


    const pickup =
      String(
        req.body.pickup_pincode || ""
      ).trim();

    const drop =
      String(
        req.body.drop_pincode || ""
      ).trim();

    const parcelWeight =
      Number(
        req.body.weight
      );

    const cod =
      Number(
        req.body.cod || 0
      );


    const latFrom =
      Number(
        req.body.lat_from
      );

    const longFrom =
      Number(
        req.body.long_from
      );

    const latTo =
      Number(
        req.body.lat_to
      );

    const longTo =
      Number(
        req.body.long_to
      );


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

        received:
          req.body

      });

    }


    const token =
      await getShiprocketToken();


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


    const quickResponse =
      await fetch(
        quickUrl,
        {
          method: "GET",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${token}`
          }
        }
      );


    const quickText =
      await quickResponse.text();


    let quickData;

    try {

      quickData =
        JSON.parse(quickText);

    } catch {

      quickData = {
        raw: quickText
      };

    }


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

      error:
        error.message

    });

  }

});


// =====================================================
// INTERNATIONAL COURIER
// =====================================================

app.post("/international/rates", async (req, res) => {

  try {

    console.log(
      "INTERNATIONAL RATE REQUEST:",
      JSON.stringify(
        req.body,
        null,
        2
      )
    );


    const sender =
      req.body.sender || {};

    const receiver =
      req.body.receiver || {};

    const pkg =
      req.body.package || {};

    const exportData =
      req.body.export || {};


    // -------------------------------------------------
    // PACKAGE VALUES
    // -------------------------------------------------

    const weight =
      Number(pkg.weight);

    const length =
      Number(pkg.length);

    const breadth =
      Number(pkg.breadth);

    const height =
      Number(pkg.height);

    const productValue =
      Number(
        pkg.productValue || 0
      );

    const quantity =
      Number(
        pkg.quantity || 1
      );


    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (
      !sender.pincode ||
      !receiver.country ||
      !receiver.pincode ||
      !Number.isFinite(weight) ||
      weight <= 0 ||
      !Number.isFinite(length) ||
      length <= 0 ||
      !Number.isFinite(breadth) ||
      breadth <= 0 ||
      !Number.isFinite(height) ||
      height <= 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "International shipment requires sender pincode, receiver country/pincode, weight and dimensions",

        received:
          req.body

      });

    }


    // -------------------------------------------------
    // SHIPROCKET LOGIN
    // -------------------------------------------------

    const token =
      await getShiprocketToken();


    console.log(
      "SHIPROCKET INTERNATIONAL LOGIN: SUCCESS"
    );


    // -------------------------------------------------
    // INTERNATIONAL DATA
    // -------------------------------------------------

    const internationalData = {

      success: true,

      serviceType:
        "International",

      action:
        "check_rates",

      sender: {

        name:
          sender.name || "",

        mobile:
          sender.mobile || "",

        email:
          sender.email || "",

        address:
          sender.address || "",

        city:
          sender.city || "",

        state:
          sender.state || "",

        pincode:
          sender.pincode || "",

        country:
          sender.country || ""

      },


      receiver: {

        name:
          receiver.name || "",

        mobile:
          receiver.mobile || "",

        email:
          receiver.email || "",

        address:
          receiver.address || "",

        city:
          receiver.city || "",

        state:
          receiver.state || "",

        pincode:
          receiver.pincode || "",

        country:
          receiver.country || ""

      },


      package: {

        itemName:
          pkg.itemName || "",

        category:
          pkg.category || "",

        sku:
          pkg.sku || "",

        quantity,

        productValue,

        currency:
          pkg.currency || "USD",

        hsn:
          pkg.hsn || "",

        weight,

        length,

        breadth,

        height

      },


      export: {

        purposeOfShipment:
          exportData.purposeOfShipment || "",

        reasonOfExport:
          Number(
            exportData.reasonOfExport || 0
          ),

        commodity:
          exportData.commodity === true ||
          exportData.commodity === "true",

        igstPaymentStatus:
          exportData.igstPaymentStatus || "A",

        termsOfInvoice:
          exportData.termsOfInvoice || "FOB",

        eori:
          exportData.eori || "",

        ioss:
          exportData.ioss || ""

      },


      shiprocket: {

        authenticated:
          !!token,

        ready_for_order_creation:
          true

      },


      message:
        "International shipment data validated successfully"

    };


    return res.json(
      internationalData
    );


  } catch (error) {

    console.error(
      "INTERNATIONAL RATE ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "International rate processing failed",

      error:
        error.message

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
