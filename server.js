app.post("/rate", async (req, res) => {
  try {
    const {
      pickup_pincode,
      drop_pincode,
      weight,
      cod = 0
    } = req.body;

    // 1. Login
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

    // 2. Hyperlocal Rate API
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

    res.status(rateResponse.status).json(rateData);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
