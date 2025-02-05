require("dotenv").config({ path: ".env.local" });
console.log("Bot Token:", ); // Debugging
console.log("Mongo URI:", );
const mongoose = require("mongoose");

const TelegramBot = require("node-telegram-bot-api");

// Replace with your Telegram bot token
const BOT_TOKEN = process.env.BOT_TOKEN;

const MONGO_URI = process.env.MONGO_URI;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB connection error:", err));
const locationSchema = new mongoose.Schema();

// Create Location Model
const Location = mongoose.model("Location", locationSchema, 'thinadhoo_address');

const sanitizeRegex = (str) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special characters
};



bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    const safeText = sanitizeRegex(text);
    const address = await Location.findOne({ title: { $regex: new RegExp(safeText, "i") } });

    if (address) {
        const addressObject = address.toObject();
        const mapsUrl = `https://www.google.com/maps?q=${addressObject?.location?.lat},${addressObject?.location?.lng}`;
        console.log(mapsUrl)

        bot.sendMessage(chatId, `📍 Location: *${addressObject.title}*\n🔗 [Open in Google Maps](${mapsUrl})`, {
            parse_mode: "Markdown",
        });
    } else {
        bot.sendMessage(chatId, "⚠️ Location not found in database.");

    }
});

console.log("🤖 Bot is running...");
