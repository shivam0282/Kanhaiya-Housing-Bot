const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { GoogleGenAI } = require('@google/genai');
const express = require('express');

// Render ke Environment Variable se securely API Key uthayega
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Render ke port binding ke liye Express Server
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Kanhaiya Housing WhatsApp Bot is Alive and Running!');
});

app.listen(PORT, () => {
    console.log(`🌐 Express Server is listening on port ${PORT}`);
});

const salesPersona = `
Tum 'Kanhaiya Housing' (Kanpur) ke senior real estate sales expert ho. 
Customer se ekdum dosto ki tarah, natural Hinglish me baat karo. Jo customer puche, uska bilkul naya aur sateek jawab do. Kabhi bhi ek hi message repeat mat karo.

Properties & Rates:
1. Meharban Singh Purwa: ₹17,000 per gaj. (Turant ghar banane ke liye best).
2. Gambhirpur: ₹5 Lakh se shuru. (Investment ke liye best).
3. Pipauri: ₹13,000 per gaj. (Bade plot kam budget me, jaise 100 gaj = ₹13 Lakh).
- Pakki Registry, Dakhil Kharij aur Free Site Visit available hai.
- Contact: 9219929784

Rules:
- Jo sawal customer puche, uska waisa hi smart aur naya jawab do.
- Kabhi bhi scripts ya labels (jaise 'AI:', 'User:') mat likho. Seedha apna message bhejo.
`;

const chatHistories = {};

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n📱 WhatsApp QR Code:\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('\n🚀 KANHAIYA HOUSING GEMINI AI BOT 100% STABLE & LIVE! 🚀\n');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const senderID = m.key.remoteJid;
        if (senderID.endsWith('@g.us')) return;

        const messageText = m.message.conversation || m.message.extendedTextMessage?.text;
        if (!messageText) return;

        console.log(`📩 Customer (${senderID}): ${messageText}`);

        try {
            await sock.sendPresenceUpdate('composing', senderID);

            if (!chatHistories[senderID]) {
                chatHistories[senderID] = [];
            }

            chatHistories[senderID].push({ role: 'user', parts: [{ text: messageText }] });

            if (chatHistories[senderID].length > 12) {
                chatHistories[senderID] = chatHistories[senderID].slice(-12);
            }

            // Gemini ka stable aur sahi model
            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: chatHistories[senderID],
                config: {
                    systemInstruction: salesPersona,
                    temperature: 0.7,
                }
            });

            const replyText = response.text ? response.text.trim() : "Ji batayein!";

            chatHistories[senderID].push({ role: 'model', parts: [{ text: replyText }] });

            await sock.sendPresenceUpdate('paused', senderID);
            await sock.sendMessage(senderID, { text: replyText });
            console.log(`🤖 Gemini AI Reply: ${replyText}\n`);

        } catch (error) {
            console.error('❌ ASLI ERROR:', error);
            await sock.sendPresenceUpdate('paused', senderID);
            await sock.sendMessage(senderID, { text: "Arre bhai, error aa gayi: " + error.message });
        }
    });
}

startBot();