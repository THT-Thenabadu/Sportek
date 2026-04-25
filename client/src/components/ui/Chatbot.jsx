import React, { useState, useRef, useEffect } from 'react';
import api from '../../lib/axios';
import Card, { CardHeader, CardContent, CardFooter } from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'model', text: 'Hi! I am the Sportek Agent. How can I help you today?' }]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsgs = [...messages, { role: 'user', text: inputText }];
    setMessages(newMsgs);
    setInputText('');
    setLoading(true);

    try {
      // API expects: { messages: [{role: 'user'|'assistant', content: string}] }
      const formattedHistory = newMsgs.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text
      }));

      const res = await api.post('/chat', { messages: formattedHistory });
      
      // Backend returns { reply: string }
      setMessages([...newMsgs, { role: 'model', text: res.data.reply }]);
    } catch (err) {
       console.error("Chat Error:", err);
      setMessages([...newMsgs, { role: 'model', text: 'Sorry, I encountered an error connecting to Sportek servers.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <Card className="w-80 sm:w-[26rem] h-[500px] flex flex-col shadow-2xl border-primary-200">
          <CardHeader className="bg-primary-600 text-white rounded-t-lg flex flex-row justify-between items-center p-4">
            <div className="flex items-center gap-2">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
               <span className="font-bold text-lg">Sportek Agent</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-primary-700 p-1 rounded-full"><svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
             {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-lg max-w-[80%] text-sm shadow-sm ${m.role === 'user' ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                    {m.text}
                  </div>
                </div>
             ))}
             {loading && <div className="text-xs text-slate-400 ml-2 animate-pulse">Agent is typing...</div>}
          </CardContent>
          <CardFooter className="p-3 bg-white border-t border-slate-200 rounded-b-lg">
             <form onSubmit={handleSend} className="flex gap-2 w-full">
               <Input className="flex-1" value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Type your message..." />
               <Button type="submit" size="icon" disabled={loading}>
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
               </Button>
             </form>
          </CardFooter>
        </Card>
      ) : (
        <button onClick={() => setIsOpen(true)} className="w-14 h-14 bg-primary-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-primary-700 hover:scale-105 transition-all outline-none focus:ring-4 focus:ring-primary-300">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </button>
      )}
    </div>
  );
}
