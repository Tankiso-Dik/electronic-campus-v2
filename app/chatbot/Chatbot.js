'use client';

import { useState } from 'react';

export default function Chatbot() {
    const [inputMessage, setInputMessage] = useState('');
    const [chatbotReply, setChatbotReply] = useState('');
    const [copyBtnActive, setCopyBtnActive] = useState(false);

    const handleSendMessage = async () => {
        const message = inputMessage.trim();

        // Don't send empty messages
        if (!message) return;

        setInputMessage(''); // Clear input field

        const fullPrompt =
            "Always answer programming questions in full.  Answer in code blocks. No comments neccesary inside code\n" +
            message;

        try {
            const res = await fetch("/api/openrouter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: fullPrompt,
                    // model: "shisa-ai/shisa-v2-llama3.3-70b:free"
                }),
            });

            const data = await res.json();
            setChatbotReply(data.reply || "⚠️ No response from AI model.");
            setCopyBtnActive(true);
            setTimeout(() => setCopyBtnActive(false), 1500);
        } catch (err) {
            console.error("Error sending message to OpenRouter proxy:", err);
            setChatbotReply("⚠️ Error connecting to OpenRouter.");
        }
    };

    const handleCopyChatbot = () => {
        if (!chatbotReply) return;
        navigator.clipboard.writeText(chatbotReply);
        setCopyBtnActive(true);
        setTimeout(() => setCopyBtnActive(false), 1500);
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
                onFocus={(e) => (e.target.placeholder = '')}
                onBlur={(e) => (e.target.placeholder = '')}
            />

            <button onClick={handleSendMessage} className="chatbot-send-button">S</button>
            <button
                id="chatbot-copy"
                onClick={handleCopyChatbot}
                className={`chatbot-send-button ${copyBtnActive ? 'active' : ''}`}
            >
                C
            </button>
        </div>
    );
}
