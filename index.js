const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 0. Base route taki browser me kholne par live status dikhe
app.get('/', (req, res) => {
    res.send("Kanhaiya Housing WhatsApp Bot is Alive!");
});

// 1. Meta Webhook Verification (Yhi wala part Meta verify karta hai)
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "kanhaiya_housing_token_123";

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log("✅ META WEBHOOK VERIFIED SUCCESSFULLY!");
            return res.status(200).send(challenge);
        } else {
            console.log("❌ Webhook verification failed: Token mismatch");
            return res.sendStatus(403);
        }
    }
    console.log("❌ Webhook verification failed: Missing mode or token");
    return res.sendStatus(400);
});

const salesPersona = `
Tum 'Kanhaiya Housing' (Kanpur) ke senior real estate sales expert ho. 
Customer se ekdum dosto ki tarah, natural Hinglish me baat karo. Jo customer puche, uska bilkul naya aur sateek jawab do. Tumhara maqsad customer ko property samjhaana, unke budget ke mutabiq plot dikhana, aur Free Site Visit book karke deal pakki karna hai.

Properties & Rates:
1. Meharban Singh Purwa: ₹17,000 per gaj. (Turant ghar banane ke liye best, residential area).
2. Gambhirpur: ₹5 Lakh se shuru. (Investment aur future growth ke liye best).
3. Pipauri: ₹13,000 per gaj. (Bade plot kam budget me, jaise 100 gaj = ₹13 Lakh).
- Pakki Registry, Dakhil Kharij aur Free Site Visit available hai.
- Contact / Office Helpline: 9219929784

Rules:
- Hamesha ChatGPT jaise smart, friendly aur convincing tarike se baat karo.
- Agar customer visit ya deal ki baat kare, toh unka naam aur preferred time pooch kar site visit fix karo.
- Kabhi bhi scripts ya labels (jaise 'AI:', 'User:') mat likho. Seedha apna message bhejo.
`;

const chatHistories = {};

// 2. WhatsApp Message Receive Hone par AI se Reply bhejna
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object) {
        try {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const messageObj = value?.messages?.[0];

            if (messageObj) {
                const senderPhone = messageObj.from;
                const messageText = messageObj.text?.body;

                if (messageText) {
                    console.log(`📩 Customer (${senderPhone}): ${messageText}`);

                    if (!chatHistories[senderPhone]) {
                        chatHistories[senderPhone] = [];
                    }

                    chatHistories[senderPhone].push({ role: 'user', content: messageText });

                    if (chatHistories[senderPhone].length > 12) {
                        chatHistories[senderPhone] = chatHistories[senderPhone].slice(-12);
                    }

const openRouterApiKey = process.env.OPENROUTER_API_KEY;
                    const apiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${openRouterApiKey}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            model: "meta-llama/llama-3.1-8b-instruct:free",
                            messages: [
                                { role: "system", content: salesPersona },
                                ...chatHistories[senderPhone]
                            ]
                        })
                    });

                    const data = await apiResponse.json();
                    const replyText = data.choices?.[0]?.message?.content?.trim() || "Ji batayein, Kanhaiya Housing me aapka swagat hai!";

                    chatHistories[senderPhone].push({ role: 'assistant', content: replyText });

                    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "EAAQHsyIXWRYBS2zgKzvZAxQRwERfGG2ZBgGBzPAuvcBcYOM1TConZBb8Ku0j8h42I04cmZBJQdPJqsSspBtPwyMdfrlrh6wO6y35pNOHU97DLZCrHpewKHuLT09P9MadnZB8cBNJeuhE03mKZBUTNI4PHZC6WQeptBEZAQg3Mn7VzPSbSbYRwD5DtfesDgzqDBLtHGiyBTZCOlPICgIuOAlrZBlLLENyWeXtzdc0LHIJ00SjMiiFZBSvQpKjUeXhqkapwo1sBAYSPQePc1sow5ytITAZB7TbR";
                    const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "1568694752990885";

                    await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            messaging_product: "whatsapp",
                            to: senderPhone,
                            text: { body: replyText }
                        })
                    });

                    console.log(`🤖 AI Reply Sent: ${replyText}\n`);
                }
            }
            return res.sendStatus(200);
        } catch (err) {
            console.error("❌ Error:", err);
            return res.sendStatus(500);
        }
    } else {
        return res.sendStatus(404);
    }
});

app.listen(PORT, () => {
    console.log(`🌐 Cloud API Server is running on port ${PORT}`);
});