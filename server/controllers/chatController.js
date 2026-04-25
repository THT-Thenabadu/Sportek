const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Context injected natively into system prompt
const systemPrompt = `You are the "Sportek Agent", a helpful AI assistant for the Sportek application.
Sportek is a premier sports property management and booking system.
Key capabilities & rules you should know:
- Customers can book sports facilities (e.g., football pitches, tennis courts) for the current day only.
- Bookings operate on dynamic time slots and include a 120-second lock to ensure nobody else books it while paying.
- The platform uses Stripe for payments.
- Sportek also hosts Admin-managed Events which have Gold, Silver, and Bronze ticket tiers.
- A user can apply to become a Property Owner via the "Become a Property Owner" form on the homepage. Admins review and approve these applications. 
- Once approved, Property Owners can manage their properties, track asset health (Good, Fair, Poor, Damaged), and view their bookings.
- Security Officers are automatically provisioned to mark customer attendance using QR Code scanning at the venue.

Be concise, incredibly helpful, polite, and enthusiastic. Format responses cleanly. Do not promise specific refunds outside of the 2-hour cancellation window logic (full refund if >2h before slot).`;

// @desc    Process chat messages via Groq API
// @route   POST /api/chat
// @access  Public
const handleChat = async (req, res) => {
  try {
    const { messages } = req.body; 

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'Messages array is required and must not be empty' });
    }

    // Map messages to Groq format (role: 'system'|'user'|'assistant')
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: formattedMessages,
      model: 'llama-3.3-70b-versatile',
    });

    const replyText = chatCompletion.choices[0]?.message?.content || '';

    res.json({ reply: replyText });
  } catch (error) {
    console.error('Chatbot Error:', error);
    res.status(500).json({ message: 'Error processing chat request' });
  }
};

module.exports = {
  handleChat
};
