import express from 'express';
import { createServer as createViteServer } from 'vite';
import Stripe from 'stripe';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

let stripeClient: Stripe | null = null;
function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key || key.includes('sk_test_...')) {
      throw new Error('A chave secreta do Stripe (STRIPE_SECRET_KEY) não foi configurada corretamente. Verifique o painel de Secrets.');
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

// Create a Stripe Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const stripe = getStripe();
    const { service, customer, orderId, paymentMethod } = req.body;
    
    // Ensure appUrl doesn't have a trailing slash
    const rawAppUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const appUrl = rawAppUrl.replace(/\/$/, '');

    // Determine payment method types based on user selection
    const payment_method_types = paymentMethod === 'pix' ? ['pix'] : ['card'];
    
    // Validate image URL for Stripe (must be a valid HTTP/HTTPS URL)
    const isValidImageUrl = service.imageUrl && service.imageUrl.startsWith('http');
    
    // Truncate description to avoid Stripe 500 char limit
    const description = (service.description || 'Serviço Premium').substring(0, 499);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: payment_method_types as any,
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: service.title,
              description: description,
              images: isValidImageUrl ? [service.imageUrl] : [],
            },
            unit_amount: Math.round(service.price * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/#/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${appUrl}/#/checkout/${service.id}`,
      customer_email: customer.email,
      metadata: {
        orderId: orderId,
        serviceId: service.id,
        customerName: customer.name,
        customerPhone: customer.phone,
      }
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify a Stripe Session status
app.get('/api/verify-session', async (req, res) => {
  try {
    const stripe = getStripe();
    const { session_id } = req.query;
    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({ error: 'session_id is required' });
    }
    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json({ payment_status: session.payment_status });
  } catch (error: any) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
