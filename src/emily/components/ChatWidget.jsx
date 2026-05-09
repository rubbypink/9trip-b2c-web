'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, ExternalLink, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { sendMessageToEmily } from '../services/chatService';

const STORAGE_KEY = 'emily-chat-history';
const SESSION_ID_KEY = 'emily-session-id';

const WELCOME_MSG = {
	id: 'welcome',
	role: 'emily',
	text: 'Dạ em chào Anh/Chị! Em là Emily, nhân viên tư vấn của 9 Trip Phú Quốc. Anh/Chị đang quan tâm đến tour du lịch hay dịch vụ nào bên em ạ?',
};

/**
 * ChatWidget — Giao diện bong bóng chat Emily.
 */
export default function ChatWidget() {
	const [isOpen, setIsOpen] = useState(false);
	const [sessionId, setSessionId] = useState(() => {
		if (typeof window !== 'undefined') {
			try {
				let sid = localStorage.getItem(SESSION_ID_KEY);
				if (!sid) {
					sid = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
					localStorage.setItem(SESSION_ID_KEY, sid);
				}
				return sid;
			} catch (e) {}
		}
		return '';
	});
	const [messages, setMessages] = useState(() => {
		if (typeof window !== 'undefined') {
			try {
				const saved = localStorage.getItem(STORAGE_KEY);
				if (saved) return JSON.parse(saved);
			} catch (e) {}
		}
		return [WELCOME_MSG];
	});
	const [inputValue, setInputValue] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const messagesEndRef = useRef(null);

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
		} catch (e) {}
	}, [messages]);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		if (isOpen) {
			scrollToBottom();
		}
	}, [messages, isOpen]);

	const clearChat = () => {
		const newSessionId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
		localStorage.setItem(SESSION_ID_KEY, newSessionId);
		setSessionId(newSessionId);
		setMessages([WELCOME_MSG]);
	};

	const handleSendMessage = async (e) => {
		e?.preventDefault();
		if (!inputValue.trim() || isLoading) return;

		const userMsg = inputValue.trim();
		setInputValue('');

		const newUserMsg = {
			id: Date.now().toString(),
			role: 'user',
			text: userMsg,
		};

		const updatedMessages = [...messages, newUserMsg];
		setMessages(updatedMessages);
		setIsLoading(true);

		const history = updatedMessages
			.filter((m) => m.id !== 'welcome')
			.map((m) => ({ role: m.role, text: m.text }));

		const response = await sendMessageToEmily(sessionId, userMsg, history);

		const emilyMsg = {
			id: (Date.now() + 1).toString(),
			role: 'emily',
			text: response.text,
			urls: response.urls,
		};

		setMessages((prev) => [...prev, emilyMsg]);
		setIsLoading(false);
	};

	return (
		<div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
			{isOpen && (
				<div className="bg-white w-80 sm:w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 border border-gray-200 transition-all duration-300 ease-in-out transform origin-bottom-right">
					<div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
						<div className="flex items-center space-x-3">
							<div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-blue-300">
								<img
									src="https://picsum.photos/100/100?random=1"
									alt="Emily Avatar"
									className="w-full h-full object-cover"
								/>
							</div>
							<div>
								<h3 className="font-bold text-lg leading-tight">Emily</h3>
								<p className="text-xs text-blue-200">Hỗ trợ khách hàng 9 Trip</p>
							</div>
						</div>
						<div className="flex items-center space-x-1">
							<button
								onClick={clearChat}
								className="text-blue-100 hover:text-white hover:bg-blue-700 p-1.5 rounded-full transition-colors"
								title="Bắt đầu cuộc hội thoại mới"
							>
								<Trash2 size={18} />
							</button>
							<button
								onClick={() => setIsOpen(false)}
								className="text-blue-100 hover:text-white hover:bg-blue-700 p-1.5 rounded-full transition-colors"
							>
								<X size={20} />
							</button>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
						{messages.map((msg) => (
							<div
								key={msg.id}
								className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
							>
								<div
									className={`max-w-[85%] p-3 rounded-2xl ${
										msg.role === 'user'
											? 'bg-blue-600 text-white rounded-tr-sm'
											: 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-tl-sm'
									}`}
								>
									{msg.role === 'emily' ? (
										<div className="prose prose-sm prose-blue max-w-none">
											<ReactMarkdown>{msg.text}</ReactMarkdown>
										</div>
									) : (
										<p className="whitespace-pre-wrap text-sm">{msg.text}</p>
									)}
								</div>

								{msg.urls && msg.urls.length > 0 && (
									<div className="mt-2 max-w-[85%] bg-blue-50 border border-blue-100 rounded-lg p-2 text-xs">
										<p className="font-semibold text-blue-800 mb-1 flex items-center">
											<ExternalLink size={12} className="mr-1" /> Nguồn tham khảo:
										</p>
										<ul className="space-y-1">
											{msg.urls.map((url, idx) => (
												<li key={idx} className="truncate">
													<a
														href={url}
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-600 hover:underline"
													>
														{url}
													</a>
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						))}

						{isLoading && (
							<div className="flex items-start">
								<div className="bg-white border border-gray-200 shadow-sm p-3 rounded-2xl rounded-tl-sm flex items-center space-x-2">
									<Loader2 size={16} className="animate-spin text-blue-600" />
									<span className="text-sm text-gray-500">Đang nhập...</span>
								</div>
							</div>
						)}
						<div ref={messagesEndRef} />
					</div>

					<div className="p-3 bg-white border-t border-gray-200">
						<form onSubmit={handleSendMessage} className="flex items-center space-x-2">
							<input
								type="text"
								value={inputValue}
								onChange={(e) => setInputValue(e.target.value)}
								placeholder="Nhập tin nhắn..."
								className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-full px-4 py-2 text-sm outline-none transition-all"
								disabled={isLoading}
							/>
							<button
								type="submit"
								disabled={!inputValue.trim() || isLoading}
								className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
							>
								<Send size={18} />
							</button>
						</form>
					</div>
				</div>
			)}

			<button
				onClick={() => setIsOpen(!isOpen)}
				className={`${
					isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
				} text-white p-4 rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center`}
			>
				{isOpen ? <X size={28} /> : <MessageCircle size={28} />}
			</button>
		</div>
	);
}
