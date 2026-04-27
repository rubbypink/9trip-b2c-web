/**
 * VNPay Payment Module
 */

/**
 * Generate VNPay Payment URL
 * @param {Object} booking 
 * @returns {Promise<string>} Payment URL
 */
export async function createVNPayUrl(booking) {
  // In a real app, logic to generate hash and URL based on vnp_TmnCode, vnp_HashSecret
  console.log("Generating VNPay URL for booking:", booking.id);
  
  return `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=${booking.id}`;
}
