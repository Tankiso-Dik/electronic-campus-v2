'use client';

import { useState } from 'react';
import { MAX_HISTORY_MESSAGES } from '../../lib/contextWindow';

export default function Chatbot() {
    const [inputMessage, setInputMessage] = useState('');
    const [chatbotReply, setChatbotReply] = useState('');
    // Keep a minimal conversation history for context window
    // Each item: { role: 'user' | 'assistant', content: string }
    const [history, setHistory] = useState([]);
    const [copyBtnActive, setCopyBtnActive] = useState(false);
    const [copyMaterialBtnActive, setCopyMaterialBtnActive] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const handleSendMessage = async () => {
        const message = inputMessage.trim();

        // Don't send empty messages
        if (!message) return;

        setInputMessage(''); // Clear input field
        if (isSending) return;
        setIsSending(true);

        try {
            const res = await fetch("/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // Send the new user message and recent history
                    prompt: message,
                    history: history.slice(-MAX_HISTORY_MESSAGES),
                }),
            });

            const data = await res.json();
            setChatbotReply(data.reply || "⚠️ No response from AI model.");
            // Update local history with this turn
            const assistantReply = data.reply || '';
            setHistory((prev) => {
                const next = [...prev, { role: 'user', content: message }, { role: 'assistant', content: assistantReply }];
                // Keep only the last N messages
                return next.slice(-MAX_HISTORY_MESSAGES);
            });
            // Keep copy indicator active until user copies the message
            setCopyBtnActive(true);
        } catch (err) {
            console.error("Error sending message to Gemini route:", err);
            setChatbotReply("⚠️ Error connecting to Gemini.");
        } finally {
            setIsSending(false);
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!isSending) handleSendMessage();
        }
    };

    const handleCopyChatbot = () => {
        if (!chatbotReply) return;
        navigator.clipboard.writeText(chatbotReply);
        // Clear the indicator only after copying
        setCopyBtnActive(false);
    };

    const handleCopyMaterial = async () => {
        try {
            const res = await fetch('/material');
            if (!res.ok) throw new Error('Failed to load material');
            const text = await res.text();
            await navigator.clipboard.writeText(text || '');
            setCopyMaterialBtnActive(true);
            setTimeout(() => setCopyMaterialBtnActive(false), 1500);
        } catch (e) {
            console.error('Error copying material:', e);
        }
    };

    return (
        <div className="chatbot-container">
            <input
                id="chatbot-input"
                type="text"
                autoComplete="off"
                style={{
                    width: '150px',
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: '#4d73bf',
                    border: 'none',
                    outline: 'none',
                    color: 'white',
                    fontSize: '12px',
                }}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={(e) => (e.target.placeholder = '')}
                onBlur={(e) => (e.target.placeholder = '')}
            />

            <button onClick={handleSendMessage} className="chatbot-send-button" disabled={isSending}>
                {isSending ? '…' : 'S'}
            </button>
            <button
                id="chatbot-copy"
                onClick={handleCopyChatbot}
                className={`chatbot-send-button ${copyBtnActive ? 'active' : ''}`}
                disabled={!chatbotReply}
            >
                C
            </button>
            <button
                id="chatbot-copy-material"
                onClick={handleCopyMaterial}
                className={`chatbot-send-button ${copyMaterialBtnActive ? 'active' : ''}`}
            >
                C
            </button>
        </div>
    );
}
