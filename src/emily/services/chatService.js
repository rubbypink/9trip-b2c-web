import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';

const chatWithEmily = httpsCallable(functions, 'chatWithEmily');

/**
 * Gửi tin nhắn đến Emily chatbot qua Firebase Callable Function.
 * @param {string} sessionId
 * @param {string} message
 * @param {{role: 'user'|'emily', text: string}[]} [history=[]]
 * @returns {Promise<{text: string, urls: string[]}>}
 */
export async function sendMessageToEmily(sessionId, message, history = []) {
	try {
		const result = await chatWithEmily({ sessionId, message, history });
		const data = result.data;
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
