// =====================================================
// INTERNATIONAL COURIER RATE
// =====================================================

app.post("/international/rates", async (req, res) => {
  try {

    console.log(
      "INTERNATIONAL RATE REQUEST:",
      JSON.stringify(req.body, null, 2)
    );

    const {
      sender = {},
      receiver = {},
      package: pkg = {},
      export: exportData = {}
    } = req.body;


    // -------------------------------------------------
    // INPUT VALIDATION
    // -------------------------------------------------

    const weight = Number(pkg.weight);
    const length = Number(pkg.length);
    const breadth = Number(pkg.breadth);
    const height = Number(pkg.height);

    const productValue = Number(
      pkg.productValue || 0
    );

    const quantity = Number(
      pkg.quantity || 1
    );


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
        received: req.body
      });

    }


    // -------------------------------------------------
    // LOGIN
    // -------------------------------------------------

    const token =
      await getShiprocketToken();

    console.log(
      "SHIPROCKET INTERNATIONAL LOGIN: SUCCESS"
    );


    // -------------------------------------------------
    // IMPORTANT
    // -------------------------------------------------
    // Shiprocket International does not use the normal
    // domestic /courier/serviceability endpoint for
    // creating international orders.
    //
    // We first return the shipment information to n8n.
    // The actual international order creation will happen
    // after customer selects the courier and payment.
    // -------------------------------------------------


    const internationalData = {

      success: true,

      serviceType: "International",

      action: "check_rates",

      sender: {
        name: sender.name || "",
        mobile: sender.mobile || "",
        email: sender.email || "",
        address: sender.address || "",
        city: sender.city || "",
        state: sender.state || "",
        pincode: sender.pincode || "",
        country: sender.country || ""
      },

      receiver: {
        name: receiver.name || "",
        mobile: receiver.mobile || "",
        email: receiver.email || "",
        address: receiver.address || "",
        city: receiver.city || "",
        state: receiver.state || "",
        pincode: receiver.pincode || "",
        country: receiver.country || ""
      },

      package: {
        itemName: pkg.itemName || "",
        category: pkg.category || "",
        sku: pkg.sku || "",
        quantity,
        productValue,
        currency: pkg.currency || "USD",
        hsn: pkg.hsn || "",
        weight,
        length,
        breadth,
        height
      },

      export: {
        purposeOfShipment:
          exportData.purposeOfShipment || "",

        reasonOfExport:
          Number(exportData.reasonOfExport || 0),

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
        authenticated: !!token,
        ready_for_order_creation: true
      },

      message:
        "International shipment data validated successfully"
    };


    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

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
