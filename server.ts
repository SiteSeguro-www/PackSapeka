import express from 'express';
import { createServer as createViteServer } from 'vite';
import bodyParser from 'body-parser';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Log request size for debugging
app.use((req, res, next) => {
  const contentLength = req.headers['content-length'];
  if (contentLength) {
    console.log(`[REQUEST] ${req.method} ${req.url} - Size: ${contentLength} bytes`);
  }
  next();
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- Stripe Client ---
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

// --- Nodemailer Transporter ---
let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('Configuração de SMTP incompleta. E-mails não serão enviados de verdade.');
      return null;
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

// --- Email Templates ---
const getOrderCreatedTemplate = (order: any) => ({
  subject: `Novo Pedido Recebido: #${order.id.substring(0, 8)}`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: #f97316;">Olá, ${order.customerName}!</h2>
      <p>Recebemos o seu pedido para <strong>${order.serviceTitle}</strong>.</p>
      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>ID do Pedido:</strong> #${order.id.substring(0, 8)}</p>
        <p style="margin: 5px 0;"><strong>Valor:</strong> R$ ${order.price.toFixed(2)}</p>
        <p style="margin: 0;"><strong>Status:</strong> Aguardando Pagamento</p>
      </div>
      <p>Assim que o pagamento for confirmado, iniciaremos o seu serviço.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666;">Este é um e-mail automático, por favor não responda.</p>
    </div>
  `
});

const getPaymentConfirmedTemplate = (order: any) => ({
  subject: `Pagamento Confirmado: #${order.id.substring(0, 8)}`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: #22c55e;">Pagamento Confirmado!</h2>
      <p>Olá, ${order.customerName}. O pagamento do seu pedido <strong>${order.serviceTitle}</strong> foi processado com sucesso.</p>
      <p>Nossa equipe já foi notificada e o seu serviço entrará em produção imediatamente.</p>
      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
        <p style="margin: 0;"><strong>Pedido:</strong> #${order.id.substring(0, 8)}</p>
        <p style="margin: 5px 0;"><strong>Serviço:</strong> ${order.serviceTitle}</p>
      </div>
      <p>Agradecemos a confiança!</p>
    </div>
  `
});

const getOrderCompletedTemplate = (order: any) => ({
  subject: `Serviço Concluído: #${order.id.substring(0, 8)}`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: #f97316;">Seu serviço está pronto!</h2>
      <p>Olá, ${order.customerName}. Temos o prazer de informar que o serviço <strong>${order.serviceTitle}</strong> foi concluído.</p>
      <p>Esperamos que o resultado tenha superado suas expectativas!</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.APP_URL}/?review=true&orderId=${order.id}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Avaliar Serviço</a>
      </div>
      <p>Se precisar de algo mais, estamos à disposição.</p>
    </div>
  `
});

const getAdminNotificationTemplate = (type: string, order: any) => {
  let title = '';
  let color = '#f97316';
  
  if (type === 'order_created') title = 'Novo Pedido Criado';
  if (type === 'payment_confirmed') { title = 'Pagamento Recebido'; color = '#22c55e'; }
  if (type === 'order_completed') title = 'Serviço Marcado como Concluído';

  return {
    subject: `[ADMIN] ${title}: #${order.id.substring(0, 8)}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: ${color};">${title}</h2>
        <p><strong>Cliente:</strong> ${order.customerName} (${order.customerEmail})</p>
        <p><strong>WhatsApp:</strong> ${order.customerPhone}</p>
        <p><strong>Serviço:</strong> ${order.serviceTitle}</p>
        <p><strong>Valor:</strong> R$ ${order.price.toFixed(2)}</p>
        <p><strong>ID:</strong> ${order.id}</p>
        <div style="margin-top: 20px;">
          <a href="${process.env.APP_URL}/admin/orders" style="color: #f97316; text-decoration: underline;">Ver no Painel Admin</a>
        </div>
      </div>
    `
  };
};

// --- API Endpoints ---

// Send Email Endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { type, order } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL;
    const mailer = getTransporter();

    if (!mailer) {
      console.log(`[MOCK EMAIL] Para: ${order.customerEmail} | Tipo: ${type}`);
      return res.json({ success: true, message: 'Modo mock: e-mail logado no console.' });
    }

    let template;
    if (type === 'order_created') template = getOrderCreatedTemplate(order);
    if (type === 'payment_confirmed') template = getPaymentConfirmedTemplate(order);
    if (type === 'order_completed') template = getOrderCompletedTemplate(order);

    if (template) {
      // Send to Customer
      await mailer.sendMail({
        from: `"Premium Services" <${process.env.SMTP_USER}>`,
        to: order.customerEmail,
        subject: template.subject,
        html: template.html,
      });

      // Send to Admin
      if (adminEmail) {
        const adminTemplate = getAdminNotificationTemplate(type, order);
        await mailer.sendMail({
          from: `"System" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: adminTemplate.subject,
          html: adminTemplate.html,
        });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Email error:', error);
    res.status(500).json({ error: error.message });
  }
});

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
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${appUrl}/checkout/${service.id}`,
      customer_email: customer.email,
      metadata: {
        orderId: orderId,
        serviceId: service.id,
        customerName: customer.name,
        customerPhone: customer.phone,
      }
    });

    console.log(`Sessão Stripe criada: ${session.id} para o pedido ${orderId}`);
    res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('Erro detalhado do Stripe:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
      requestId: error.requestId
    });
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
