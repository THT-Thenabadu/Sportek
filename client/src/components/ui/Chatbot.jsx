import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardContent, CardFooter } from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';

const QA_RULES = {
  "What are the opening hours?": "Most of our venues are open from 06:00 to 22:00. However, specific hours may vary by property.",
  "How do I reserve a venue?": "You can reserve a venue by navigating to the 'Venues' page, selecting a property, and booking an available slot.",
  "How to report a problem?": "To report a problem, you can click the 'STILL NEED HELP? RAISE TICKET' button below to submit a complaint.",
  "What can you do?": "I can answer frequently asked questions about Sportek, help you find opening hours, booking instructions, and guide you to support."
};

const QUICK_REPLIES = [
  "What are the opening hours?",
  "How do I reserve a venue?",
  "How to report a problem?",
  "What can you do?"
];

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'model', text: "Hello! I'm the Sportek Assistant. What can I help you find today?" }]);
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

    // Rule-based keyword matching
    let replyText = "I'm a simple bot. Try asking about bookings, cancellations, payments, or owner accounts.";

    if (/(hi|hello|hey|good morning|good evening)/.test(userTextLower)) {
      replyText = "Hi there! Welcome to Sportek. How can I help you today? You can ask me about bookings, facilities, events, or your account.";
    } else if (/(book|booking|reserve|reservation)/.test(userTextLower)) {
      replyText = "To make a booking, browse our Venues page, select a facility, choose an available time slot and complete payment via Stripe. You can view all your bookings in your dashboard under My Bookings.";
    } else if (/(cancel|cancellation|refund)/.test(userTextLower)) {
      replyText = "You can cancel a booking from your dashboard. If you cancel at least 2 hours before the start time, you will receive a full refund automatically via Stripe. Cancellations within 2 hours are not permitted.";
    } else if (/(pay|payment|stripe)/.test(userTextLower)) {
      replyText = "We use Stripe for secure payments. You can pay using any major credit or debit card. Payments are processed immediately upon booking.";
    } else if (/(owner|property owner|list property|host)/.test(userTextLower)) {
      replyText = "Want to list your sports facility? Click 'Become a Property Owner' on the homepage to apply. Once an Admin approves your application, you can manage properties, set pricing, and track bookings.";
    } else if (userTextLower.includes('opening hours')) {
      replyText = "Opening hours depend on the specific facility. You can view the available time slots for each property on their details page under the Venues tab.";
    } else if (userTextLower.includes('report a problem')) {
      replyText = "If you encounter any issues at a venue or with a booking, you can raise a support ticket from your Customer Dashboard under the Complaints section.";
    } else if (userTextLower.includes('what can you do')) {
      replyText = "I can answer basic questions about bookings, cancellations, payments, and property management. If you need further assistance, you can raise a ticket!";
    } else if (userTextLower.includes('raise a ticket')) {
      replyText = "Redirecting you to the Complaints page to raise a support ticket...";
      setTimeout(() => {
        setIsOpen(false);
        navigate('/dashboard/complaints');
      }, 1500);
    }

    // Small delay to simulate thinking
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'model', text: replyText }]);
    }, 500);
  };

  const handleSend = (e) => {
    e.preventDefault();
    processInput(inputText);
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
              <div className="w-6 h-6 bg-blue-500 rounded text-white flex items-center justify-center text-xs">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <span className="font-bold text-sm tracking-wider uppercase">SPORTEK AI</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:text-slate-300 transition-colors p-1"><svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-xl max-w-[85%] text-sm shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
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
        <button onClick={() => setIsOpen(true)} className="w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-800 hover:scale-105 transition-all outline-none focus:ring-4 focus:ring-slate-300">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </button>
      )}
    </div>
  );
}
