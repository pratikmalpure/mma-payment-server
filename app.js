const express = require('express');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
const { validateWebhookSignature } = require('razorpay/dist/utils/razorpay-utils');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // allows your AI Studio frontend to call this
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Your Razorpay credentials (set these as env variables on Render)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Health check — visit your Render URL to confirm it's running
app.get('/', (req, res) => {
  res.json({ status: 'MMA Architects payment server running ✅' });
});

// STEP 1: Create order (called by your React frontend)
app.post('/create-order', async (req, res) => {
  try {
    const options = {
      amount: 1000 * 100, // ₹1000 in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: true, // autocapture ON
    };

    const order = await razorpay.orders.create(options);
    res.json({ order_id: order.id, amount: order.amount, currency: order.currency });

  } catch (error) {
    console.error('Order creation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// STEP 2: Verify payment signature (called after Razorpay checkout completes)
app.post('/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  try {
    const isValidSignature = validateWebhookSignature(body, razorpay_signature, secret);

    if (isValidSignature) {
      console.log('Payment verification successful:', razorpay_payment_id);
      res.status(200).json({ status: 'ok' });
    } else {
      res.status(400).json({ status: 'verification_failed' });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
