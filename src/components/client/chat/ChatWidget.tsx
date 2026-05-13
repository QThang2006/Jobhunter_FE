import { useState, useRef, useEffect } from 'react';
import { BsChatDotsFill, BsSendFill, BsX, BsRobot } from 'react-icons/bs';
import styles from './ChatWidget.module.scss';
import axios from '@/config/axios-customize';
import JobCardMini, { IJobMini } from './JobCardMini';

interface IChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    jobs?: IJobMini[];
}

interface IBackendResponse {
    botMessage: string;
    jobs: IJobMini[];
}

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<IChatMessage[]>([
        {
            id: 'welcome',
            text: 'Chào bạn! Tôi là AI JobHunter. Bạn đang tìm kiếm công việc như thế nào? (VD: Tìm việc Java lương trên 20 triệu tại Hà Nội)',
            sender: 'bot'
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMsg: IChatMessage = {
            id: Date.now().toString(),
            text: input,
            sender: 'user'
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Call API - axios-customize returns response.data directly
            const response = await axios.post<any>('/api/v1/chat', {
                message: userMsg.text
            });

            console.log('Backend Response:', response); // Debug log

            // Backend wraps response in: { statusCode, error, message, data: { botMessage, jobs } }
            const actualData = response.data || response;

            if (actualData && actualData.botMessage) {
                const botMsg: IChatMessage = {
                    id: (Date.now() + 1).toString(),
                    text: actualData.botMessage,
                    sender: 'bot',
                    jobs: actualData.jobs || []
                };
                setMessages(prev => [...prev, botMsg]);
            } else {
                console.error('Invalid response format:', response);
                throw new Error('Invalid response format');
            }

        } catch (error) {
            console.error("Chat Error:", error);
            const errorMsg: IChatMessage = {
                id: (Date.now() + 1).toString(),
                text: "Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau.",
                sender: 'bot'
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }

    return (
        <div className={styles.chatWidgetContainer}>
            {isOpen && (
                <div className={styles.chatWindow}>
                    <div className={styles.header}>
                        <div className={styles.title}>
                            <BsRobot size={20} />
                            AI Job Assistant
                            <span className={styles.status}></span>
                        </div>
                        <BsX size={24} style={{ cursor: 'cursor' }} onClick={() => setIsOpen(false)} />
                    </div>

                    <div className={styles.messageArea}>
                        {messages.map((msg) => (
                            <div key={msg.id} className={`${styles.messageBubble} ${styles[msg.sender]}`}>
                                {msg.text}
                                {msg.jobs && msg.jobs.length > 0 && (
                                    <div style={{ marginTop: 10 }}>
                                        {msg.jobs.map(job => (
                                            <JobCardMini key={job.id} job={job} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className={`${styles.messageBubble} ${styles.bot}`}>
                                <div className={styles.loadingDots}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.inputArea}>
                        <input
                            type="text"
                            placeholder="Nhập yêu cầu tìm việc..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                        />
                        <button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
                            <BsSendFill size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div
                className={`${styles.chatButton} ${isOpen ? styles.open : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <BsX size={32} /> : <BsChatDotsFill size={28} />}
            </div>
        </div>
    );
};

export default ChatWidget;
