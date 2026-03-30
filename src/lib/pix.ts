export function generatePixPayload(key: string, name: string, city: string, amount: number, txid: string = '***'): string {
  const formatLength = (val: string) => String(val.length).padStart(2, '0');
  
  const payloadKey = `0014br.gov.bcb.pix01${formatLength(key)}${key}`;
  const merchantAccountInfo = `26${formatLength(payloadKey)}${payloadKey}`;
  const merchantCategoryCode = '52040000';
  const transactionCurrency = '5303986';
  const amountStr = amount.toFixed(2);
  const transactionAmount = amount ? `54${formatLength(amountStr)}${amountStr}` : '';
  const countryCode = '5802BR';
  
  // Max length for name is 25, city is 15
  const safeName = name.substring(0, 25).replace(/[^a-zA-Z0-9 ]/g, '');
  const safeCity = city.substring(0, 15).replace(/[^a-zA-Z0-9 ]/g, '');
  
  const merchantName = `59${formatLength(safeName)}${safeName}`;
  const merchantCity = `60${formatLength(safeCity)}${safeCity}`;
  
  const txidStr = `05${formatLength(txid)}${txid}`;
  const additionalDataField = `62${formatLength(txidStr)}${txidStr}`;

  const payload = `000201010211${merchantAccountInfo}${merchantCategoryCode}${transactionCurrency}${transactionAmount}${countryCode}${merchantName}${merchantCity}${additionalDataField}6304`;

  // CRC16 CCITT-FALSE
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  const crcStr = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  
  return payload + crcStr;
}
