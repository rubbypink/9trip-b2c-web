const CLOUD_FUNCTION_URL = process.env.NEXT_PUBLIC_CLOUD_FUNCTION_URL || 'https://asia-southeast1-tripphuquoc-db-fs.cloudfunctions.net';
const CHAT_URL = `${CLOUD_FUNCTION_URL}/chatWithEmily`;

/**
 * @param {string} sessionId
 * @param {string} message
 * @param {{role: 'user'|'emily', text: string}[]} [history=[]]
 * @returns {Promise<{text: string, urls: string[]}>}
 */
export async function sendMessageToEmily(sessionId, message, history = []) {
	try {
		const res = await fetch(CHAT_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ sessionId, message, history }),
		});

		if (!res.ok) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		}

		const data = await res.json();
		return {
			text: data.text || 'Xin lỗi Anh/Chị, em chưa hiểu rõ ý của mình ạ.',
			urls: data.urls || [],
		};
	} catch (error) {
		console.error('Error sending message to Emily:', error);
		return {
			text: 'Xin lỗi Anh/Chị, hiện tại hệ thống đang bận hoặc mất kết nối. Anh/Chị vui lòng thử lại sau ít phút nhé.',
			urls: [],
		};
	}
}
