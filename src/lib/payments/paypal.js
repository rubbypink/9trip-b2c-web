/**
 * PayPal Payment Module
 */

/**
 * Create PayPal Order
 * @param {Object} booking 
 * @returns {Promise<string>} PayPal Order URL
 */
export async function createPayPalOrder(booking) {
  console.log("Creating PayPal order for booking:", booking.id);
  
  return `https://www.paypal.com/checkoutnow?token=${booking.id}`;
}
