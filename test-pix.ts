import { generatePixPayload } from './src/lib/pix.js';

const payload = generatePixPayload('4ba410d8-bf07-4f04-beb7-9f64c6738082', 'Admin', 'Sao Paulo', 10.50, '***');
console.log(payload);
