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

    if (!pickup || !drop || !Number.isFinite(parcelWeight) || parcelWeight <= 0) {
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

    // RATE
    const rateUrl =
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability/" +
      `?pickup_postcode=${encodeURIComponent(pickup)}` +
      `&delivery_postcode=${encodeURIComponent(drop)}` +
      `&weight=${encodeURIComponent(parcelWeight)}` +
      `&cod=${encodeURIComponent(codAmount)}`;

    console.log("RATE URL:", rateUrl);

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
      rateData = { raw: rateText };
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
