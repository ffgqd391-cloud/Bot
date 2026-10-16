const { Telegraf } = require('telegraf');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const UPI_ID = '9232681695@omni';
const BINANCE_ID = '1146205487';
const BINANCE_NAME = 'verla Serpas Nnpl';

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function getLiveUSDPrice(inrAmount) {
    try {
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/INR');
        return (inrAmount * response.data.rates.USD).toFixed(2);
    } catch (err) {
        return "10.50";
    }
}

async function buildSystemPrompt() {
    const usdPrice1000 = await getLiveUSDPrice(1000);
    const usdPrice800 = await getLiveUSDPrice(800);

    return `You are an intelligent, professional, and friendly sales representative answering DMs on behalf of "gsmxedits", an experienced developer.

RULES:
1. Developer Identity: Developer handle is "gsmxedits". If someone asks who made the bot or asks for custom fixes/bots/development work, tell them "gsmxedits" is an experienced developer who can fix or build custom bots/tools for them.
2. Language Matching: Respond in the exact language style used by the user (English, Hindi, or Hinglish). Keep the tone polite, natural, and helpful.
3. Product Availability: All bots (Level Up bot, Guild Glory bot, CS bot, BR bot, LW bot) are FULLY AVAILABLE and WORKING.
4. Pricing & Rates: Standard Price is ₹1,000 INR (~ $${usdPrice1000} USD).
5. Negotiation: You can negotiate down to a MINIMUM of ₹800 INR (~ $${usdPrice800} USD). NEVER go below ₹800 INR. If offered below ₹800 INR, decline politely.
6. Payment Methods:
   - UPI / QR Request: \`${UPI_ID}\`
   - Binance / Crypto Request: ID \`${BINANCE_ID}\` | Name: \`${BINANCE_NAME}\`
7. Payment Proof: If user says they paid or sent screenshot, reply: "Ok sir, I will check. Please wait for my owner to come online and check payment. And send you the bot."`;
}

// Function to process incoming messages (both direct and business DMs)
async function handleIncomingMessage(ctx, text, hasPhoto, businessConnectionId) {
    // Reply target helper
    const reply = (replyText) => {
        if (businessConnectionId) {
            return ctx.reply(replyText, { business_connection_id: businessConnectionId, parse_mode: 'Markdown' });
        }
        return ctx.reply(replyText, { parse_mode: 'Markdown' });
    };

    // Hardcoded trigger for payment proof / screenshots
    if (hasPhoto || text.toLowerCase().includes('payment') || text.toLowerCase().includes('paid') || text.toLowerCase().includes('ss') || text.toLowerCase().includes('screenshot')) {
        return reply("Ok sir I will check please wait for my owner to come online and check payment. And send you the bot.");
    }

    try {
        const systemPrompt = await buildSystemPrompt();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `${systemPrompt}\n\nUser Message: "${text}"\n\nYour Response:`;
        const result = await model.generateContent(prompt);
        const aiResponse = result.response.text();

        await reply(aiResponse);
    } catch (err) {
        console.error("Gemini API Error Detail:", err);
        await reply("Yes bro! All bots (Lvl Up, Guild Glory, CS, BR, LW) are available and working fine. How can I help you?");
    }
}

// 1. Listen to Telegram Business DMs (when people message your personal account)
bot.on('business_message', async (ctx) => {
    const text = ctx.businessMessage.text || '';
    const hasPhoto = Boolean(ctx.businessMessage.photo);
    const businessConnectionId = ctx.businessMessage.business_connection_id;

    await handleIncomingMessage(ctx, text, hasPhoto, businessConnectionId);
});

// 2. Listen to Direct Bot DMs (testing directly inside bot chat)
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
            res.status(200).send('Telegram Bot Webhook Endpoint is Running!');
        }
    } catch (error) {
        console.error("Webhook processing error:", error);
        res.status(500).send('Error');
    }
};
