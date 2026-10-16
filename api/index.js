const { Telegraf } = require('telegraf');
const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');

// Read environment variables set in Vercel Dashboard
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const UPI_ID = '9232681695@omni';
const BINANCE_ID = '1146205487';
const BINANCE_NAME = 'verla Serpas Nnpl';

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Dynamic USD conversion rate helper
async function getLiveUSDPrice(inrAmount) {
    try {
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/INR');
        const rate = response.data.rates.USD;
        return (inrAmount * rate).toFixed(2);
    } catch (err) {
        return "10.50";
    }
}

async function buildSystemPrompt() {
    const usdPrice1000 = await getLiveUSDPrice(1000);
    const usdPrice800 = await getLiveUSDPrice(800);

    return `
You are an intelligent, professional, and friendly sales representative answering DMs on behalf of "gsmxedits", an experienced developer.

### RULES:
1. **Developer Identity**: Developer handle is "gsmxedits". If someone asks who made the bot or asks for custom fixes/bots, state that "gsmxedits" is an experienced developer who can fix or code custom bots for them.
2. **Language Matching**: Respond in the exact language style used by the user (English, Hindi, or Hinglish).
3. **Product Availability**: All bots (Lvl Up, Guild Glory, CS, BR, LW, etc.) are FULLY AVAILABLE and WORKING.
4. **Pricing Policy**: Standard Price: ₹1,000 INR (~ $${usdPrice1000} USD). Negotiate down to minimum ₹800 INR (~ $${usdPrice800} USD). Never accept below ₹800 INR.
5. **Payment Methods**:
   - UPI / QR Request: \`${UPI_ID}\`
   - Binance / Crypto Request: ID \`${BINANCE_ID}\` | Name: \`${BINANCE_NAME}\`
`;
}

// Register bot message handling logic
bot.on('message', async (ctx) => {
    const text = ctx.message.text || '';
    const hasPhoto = Boolean(ctx.message.photo);

    // Hardcoded trigger for payment proofs / screenshots
    if (hasPhoto || text.toLowerCase().includes('payment') || text.toLowerCase().includes('paid') || text.toLowerCase().includes('ss') || text.toLowerCase().includes('screenshot')) {
        return ctx.reply("Ok sir I will check please wait for my owner to come online and check payment. And send you the bot.");
    }

    try {
        const systemPrompt = await buildSystemPrompt();

        const messages = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: "Understood. I will represent gsmxedits professionally." }] },
            { role: 'user', parts: [{ text: text || "[User sent media/non-text]" }] }
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: messages,
        });

        await ctx.reply(response.text, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error("AI Error:", err);
        ctx.reply("Yes bro, all bots are available and working!");
    }
});

// Vercel Serverless Function HTTP Handler
module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body, res);
            if (!res.headersSent) {
                res.status(200).send('OK');
            }
        } else {
            res.status(200).send('Telegram Bot Webhook Endpoint is Running!');
        }
    } catch (error) {
        console.error("Webhook processing error:", error);
        res.status(500).send('Error');
    }
};
