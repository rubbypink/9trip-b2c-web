const API_URL = '/api/agent-platform';

/**
 * @param {string} message
 * @param {{role: 'user'|'emily', text: string}[]} [history=[]]
 * @returns {Promise<{text: string, urls: string[]}>}
 */
export async function sendMessageToEmily(message, history = []) {
	try {
		const res = await fetch(API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message, history }),
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
