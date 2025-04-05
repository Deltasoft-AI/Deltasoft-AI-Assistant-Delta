// Load environment variables
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Import custom modules
const { handleAIResponse, fetchReplyContext, isReplyToBot } = require('./utils/aiHandler');
const { loadMemory, saveMemory, startAutoSave, getMemory, addToDMMemory, addToChannelMemory, initializeChannelMemory, setChannelFlag } = require('./utils/memory');

// DEV MODE settings
const DEV_MODE = process.env.DEV_MODE === 'true';
const DEV_USER_ID = process.env.DEV_USER_ID; // Put your user ID in the .env file

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
}

client.once('ready', () => {
    console.log('Deltasoft AI is online! 🚀');
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    console.log(`[MESSAGE RECEIVED] From: ${message.author.username} | Content: ${message.content}`);

    if (DEV_MODE && message.author.id !== DEV_USER_ID) {
        console.log(`[DEV MODE] Ignoring message from non-dev user: ${message.author.username}`);
        return;
    }

    const isDM = !message.guild;
    const isReply = message.reference && message.reference.messageId;
    const isMentioned = message.mentions.has(client.user);
    const memory = getMemory();

    if (isDM) {
        console.log(`[DM DETECTED] User: ${message.author.username}`);
        const userId = message.author.id;
        
        // Initialize DM memory if not exists
        if (!memory[userId]) {
            memory[userId] = [];
        }

        // Add user's message to DM memory
        addToDMMemory(userId, message);

        // Get reply context if message is a reply
        const replyContext = isReply ? await fetchReplyContext(message) : null;
        if (replyContext) {
            console.log(`[DM] Reply context found: ${replyContext}`);
        } else if (isReply) {
            console.log(`[DM] No reply context found for replied message.`);
        }

        // Process message and get AI response
        return await handleAIResponse(message, memory[userId], replyContext, 'dm');
    }

    // Handle channel messages
    const channelId = message.channel.id;
    const channelData = initializeChannelMemory(channelId);
    
    // Add message to channel memory
    addToChannelMemory(channelId, message);

    // Check if message requires AI response
    const isReplyingToBot = isReply && await isReplyToBot(message);
    if (!isMentioned && !isReplyingToBot) {
        console.log(`[CHANNEL] No mention/reply to bot detected`);
        return;
    }

    console.log(`[CHANNEL] Bot was mentioned or replied to.`);

    // Get reply context if message is a reply
    const replyContext = isReply ? await fetchReplyContext(message) : null;
    if (replyContext) {
        console.log(`[CHANNEL] Reply context found: ${replyContext}`);
    } else if (isReply) {
        console.log(`[CHANNEL] No reply context found for replied message.`);
    }

    // Determine if channel memory was reset
    const memoryResetNote = !channelData.flag ? 'Note: Previous channel context was cleared due to inactivity.' : '';

    // Process message with appropriate context
    await handleAIResponse(message, channelData.history, replyContext, 'channel', memoryResetNote);

    // Reset flag after processing
    channelData.flag = true;
    console.log(`[CHANNEL] Flag reset to TRUE after AI interaction.`);
});

loadMemory();
startAutoSave();

process.on('SIGINT', () => {
    saveMemory();
    console.log('[SHUTDOWN] Memory saved before exit.');
    process.exit();
});

client.login(process.env.DISCORD_TOKEN);