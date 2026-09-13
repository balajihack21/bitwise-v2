import React, { useState, useEffect, useRef } from 'react';
import { sendMessageToAI } from '../services/geminiService';
import { ChatMessage, User } from '../types';

interface AITutorProps {
  user?: User | null;
  onLoginClick?: () => void;
}

const AITutor: React.FC<AITutorProps> = ({ user, onLoginClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hi! I\'m BitBot. 👋 I can help explain tech concepts or guide you through our courses. What are you learning today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!user) {
      if (onLoginClick) onLoginClick();
      return;
    }
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToAI(input);
      const botMsg: ChatMessage = { role: 'model', text: responseText, timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      // Error handling is done in service
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      
      {/* Chat Window */}
      <div 
        className={`pointer-events-auto bg-white w-[90vw] md:w-96 h-[500px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 origin-bottom-right mb-4 overflow-hidden ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none hidden'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-bitwise-600 to-bitwise-500 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <i className="fa-solid fa-robot text-sm"></i>
            </div>
            <div>
              <h3 className="font-bold text-sm">BitBot AI Tutor</h3>
              <p className="text-[10px] text-white/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Online
              </p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
        
        {/* Powered By Text */}
        <div className="bg-slate-50 border-b border-slate-200 py-1 text-center">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Powered by Bitwise Learning Hub</p>
        </div>

        {/* Member Check */}
        {!user ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-slate-50 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center text-2xl shadow-sm">
              <i className="fa-solid fa-lock"></i>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">BitBot AI is a Member Perk</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Log in or create a free account to unlock 24/7 personalized coding assistance, debugging advice, and problem hints.
              </p>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                if (onLoginClick) onLoginClick();
              }}
              className="px-5 py-2.5 bg-bitwise-600 hover:bg-bitwise-700 text-white text-xs font-bold rounded-xl shadow-md shadow-bitwise-600/20 transition-all transform hover:scale-105"
            >
              Log In / Sign Up to Chat
            </button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-hide">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-bitwise-600 text-white rounded-br-none' 
                        : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                 <div className="flex justify-start">
                   <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex gap-1">
                     <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                     <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                     <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                   </div>
                 </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..." 
                  className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-bitwise-200 outline-none text-slate-800 placeholder-slate-400"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 bg-bitwise-600 hover:bg-bitwise-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fa-solid fa-paper-plane text-sm"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-105 ${
            isOpen ? 'bg-slate-700 rotate-90' : 'bg-bitwise-600 hover:bg-bitwise-500'
        }`}
      >
        {isOpen ? (
            <i className="fa-solid fa-times text-white text-xl"></i>
        ) : (
            <i className="fa-solid fa-robot text-white text-xl"></i>
        )}
      </button>
    </div>
  );
};

export default AITutor;