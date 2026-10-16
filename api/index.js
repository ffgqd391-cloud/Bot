const { Telegraf } = require('telegraf');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const UPI_ID = '9232681695@omni';
const BINANCE_ID = '1146205487';
const BINANCE_NAME = 'verla Serpas Nnpl';

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

const SYSTEM_PROMPT = `You are an intelligent, professional, and friendly sales representative answering DMs on behalf of "gsmxedits", an experienced developer.

RULES & INSTRUCTIONS:
1. Developer Identity: Developer handle is "gsmxedits". If someone asks who made the bot or asks for custom fixes/bots/development work, tell them "gsmxedits" is an experienced developer who can fix or build custom bots/tools for them.
2. Language Matching: Respond in the exact language style used by the user (English, Hindi, or Hinglish). Keep the tone polite, natural, and helpful.
3. Product Availability: All bots (Level Up bot, Guild Glory bot, CS bot, BR bot, LW bot) are FULLY AVAILABLE and WORKING.
4. Pricing & Rates: Standard Price is ₹1,000 INR (approx $10.50 USD).
5. Negotiation: You can negotiate down to a MINIMUM of ₹800 INR (approx $8.40 USD). NEVER go below ₹800 INR. If offered below ₹800 INR, decline politely.
6. Payment Methods:
   - UPI / QR Request: \`${UPI_ID}\`
   - Binance / Crypto Request: ID \`${BINANCE_ID}\` | Name: \`${BINANCE_NAME}\`
7. Payment Proof: If user says they paid or sent screenshot, reply: "Ok sir, I will check. Please wait for my owner to come online and check payment. And send you the bot."`;

// Call Gemini API directly via REST to avoid SDK crashes
async function getGeminiResponse(userText) {
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is not set!");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: `${SYSTEM_PROMPT}\n\nCustomer Message: "${userText}"\n\nSales Rep Response:` }]
            }
        ]
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
    } else {
        console.error("Gemini Response Error:", data);
        throw new Error("Invalid API response format");
    }
}

async function handleIncomingMessage(ctx, text, hasPhoto, businessConnectionId) {
    const sendReply = async (replyText) => {
        try {
            if (businessConnectionId) {
                await ctx.reply(replyText, { business_connection_id: businessConnectionId, parse_mode: 'Markdown' });
            } else {
                await ctx.reply(replyText, { parse_mode: 'Markdown' });
            }
        } catch (e) {
            console.error("Telegram send message error:", e);
        }
    };

    const lowerText = text.toLowerCase();

    // Direct Payment trigger
    if (hasPhoto || lowerText.includes('payment') || lowerText.includes('paid') || lowerText.includes('ss') || lowerText.includes('screenshot')) {
        return sendReply("Ok sir I will check please wait for my owner to come online and check payment. And send you the bot.");
    }

    try {
        const aiReply = await getGeminiResponse(text || "Hello");
        await sendReply(aiReply);
    } catch (err) {
        console.error("Failed to generate AI response:", err);
        // Smart fallback answer
        await sendReply("Yes bro! All bots (Level Up, Guild Glory, CS, BR, LW) are available and working fine. Standard price is ₹1,000 INR. How can I help you?");
    }
}

// Handle Telegram Business DMs (when clients DM your personal account)
bot.on('business_message', async (ctx) => {
    const text = ctx.businessMessage.text || '';
    const hasPhoto = Boolean(ctx.businessMessage.photo);
    const businessConnectionId = ctx.businessMessage.business_connection_id;

    await handleIncomingMessage(ctx, text, hasPhoto, businessConnectionId);
});

// Handle Direct Bot DMs (testing directly inside the bot)
bot.on('message', async (ctx) => {
    const text = ctx.message.text || '';
    const hasPhoto = Boolean(ctx.message.photo);

    await handleIncomingMessage(ctx, text, hasPhoto, null);
});

module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body, res);
            if (!res.headersSent) res.status(200).send('OK');
        } else {
            res.status(200).send('Telegram Bot Webhook Endpoint is Active!');
        }
    } catch (error) {
        console.error("Webhook Handler Error:", error);
        if (!res.headersSent) res.status(500).send('Error');
    }
};
