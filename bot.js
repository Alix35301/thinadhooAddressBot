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
mongoose.connect(MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    keepAlive: true
})
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// Add connection error handlers
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    mongoose.connect(MONGO_URI);
});

const locationSchema = new mongoose.Schema();

// Create Location Model
const Location = mongoose.model("Location", locationSchema, 'thinadhoo_address');

// Add Analytics Schema
const analyticsSchema = new mongoose.Schema({
    totalMessages: { type: Number, default: 0 },
    uniqueUsers: { type: Set, default: new Set() },
    lastUpdated: { type: Date, default: Date.now }
});

// Create Analytics Model
const Analytics = mongoose.model("Analytics", analyticsSchema, 'bot_analytics');

const sanitizeRegex = (str) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special characters
};

// Add command to check analytics - restricted to admin

const handleStatsCommand = async (msg) => {
    try {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        // Check if user is admin
        if (userId !== Number(process.env.ADMIN_USER_ID)) {
            return; // Silently ignore the command from non-admin users
        }

        const analytics = await Analytics.findOne({});
        
        if (analytics) {
            const stats = `📊 Bot Statistics\n\n` +
                         `Total Messages: ${analytics.totalMessages}\n` +
                         `Unique Users: ${analytics.uniqueUsers.size}\n` +
                         `Last Updated: ${analytics.lastUpdated.toLocaleString()}`;
            
            await bot.sendMessage(chatId, stats);
        } else {
            await bot.sendMessage(chatId, "No statistics available yet.");
        }
    } catch (error) {
        console.error('Error fetching analytics:', error);
        bot.sendMessage(chatId, "⚠️ Error fetching statistics.");
    }
};

bot.on("message", async (msg) => {
    try {
        const chatId = msg.chat.id;
        const text = msg.text;
        const userId = msg.from.id;

        // handle stats command
        if (text === "/stats") {
            handleStatsCommand(msg);
            return;
        }

        // Update analytics
        const analytics = await Analytics.findOne({}) || new Analytics();
        analytics.totalMessages += 1;
        analytics.uniqueUsers.add(userId);
        analytics.lastUpdated = new Date();
        await analytics.save();

        if (!text) {
            bot.sendMessage(chatId, "⚠️ Please send a text message.");
            return;
        }

        const safeText = sanitizeRegex(text);
        const address = await Location.findOne({ title: { $regex: new RegExp(safeText, "i") } });

        if (address) {
            const addressObject = address.toObject();
            if (!addressObject?.location?.lat || !addressObject?.location?.lng) {
                bot.sendMessage(chatId, "⚠️ Location coordinates are missing in the database.");
                return;
            }
            
            const mapsUrl = `https://www.google.com/maps?q=${addressObject.location.lat},${addressObject.location.lng}`;
            console.log('Found location:', addressObject.title, mapsUrl);

            await bot.sendMessage(chatId, `📍 Location: *${addressObject.title}*\n🔗 [Open in Google Maps](${mapsUrl})`, {
                parse_mode: "Markdown",
            });
        } else {
            console.log('Location not found for query:', text);
            await bot.sendMessage(chatId, "⚠️ Location not found in database.");
        }
    } catch (error) {
        console.error('Error processing message:', error);
        bot.sendMessage(chatId, "⚠️ An error occurred while processing your request.");
    }
});

// Add error handler for bot
bot.on('error', (error) => {
    console.error('Bot error:', error);
});

console.log("🤖 Bot is running...");
