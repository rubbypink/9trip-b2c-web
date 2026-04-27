/**
 * MoMo Payment Module
 */

/**
 * Create MoMo Payment Request
 * @param {Object} booking 
 * @returns {Promise<string>} Payment URL
 */
export async function createMomoRequest(booking) {
  console.log("Creating MoMo request for booking:", booking.id);
  
  return `https://test-payment.momo.vn/v2/gateway/api/create?orderId=${booking.id}`;
}
