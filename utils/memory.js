const fs = require('fs');
const path = require('path');

const memoryPath = path.join(__dirname, '../data/memory.json');
let memory = {};

// Load memory from disk
function loadMemory() {
    if (fs.existsSync(memoryPath)) {
        memory = JSON.parse(fs.readFileSync(memoryPath));
        console.log('Memory loaded from disk.');
    } else {
        console.log('No memory file found, starting fresh.');
    }
}

// Save memory to disk
function saveMemory() {
    fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
    console.log('Memory saved to disk.');
}

// Periodic autosave (e.g., every 60 seconds)
function startAutoSave() {
    setInterval(() => {
        saveMemory();
    }, 60000); // 60 seconds
}

// Access memory object globally
function getMemory() {
    return memory;
}

// Add message to DM memory
function addToDMMemory(userId, message) {
    if (!memory[userId]) {
        memory[userId] = [];
    }

    
    function formatMessageText(message) {
        if (message.author?.bot) {
            return message.content;
        }
        
        if (message.reference) {
            const referencedMessage = message.channel.messages.cache.get(message.reference.messageId);
            const replyToUsername = referencedMessage?.author?.username || 'unknown';
            const replyToContent = referencedMessage?.content || '';
            const hasImage = referencedMessage?.attachments?.size > 0;
            const imageText = hasImage ? '[image]' : '';
            const replyText = replyToContent ? `${replyToContent} ${imageText}` : imageText || 'message not found';
            return `${message.author.username}: *Replying to ${replyToUsername}: ${replyText}* ${message.content}`;
        }
        
        return `${message.author.username}: ${message.content}`;
    }

    const messageObj = {
        role: message.author?.bot ? 'assistant' : 'user',
        content: [{
            type: message.author?.bot ? 'output_text' : 'input_text',
            text: formatMessageText(message)
        }],
        timestamp: message.createdTimestamp,
        messageId: message.id,
        isReply: message.reference ? true : false,
        replyTo: message.reference ? message.reference.messageId : null
    };

    // Add image attachments from the current message
    if (!message.author?.bot && message.attachments && message.attachments.size > 0) {
        message.attachments.forEach(attachment => {
            if (attachment.contentType?.startsWith('image/')) {
                messageObj.content.push({
                    type: 'input_image',
                    image_url: attachment.url
                });
            }
        });
    }
    
    // Add image attachments from referenced message if it's a user reply
    if (!message.author?.bot && message.reference) {
        const referencedMessage = message.channel.messages.cache.get(message.reference.messageId);
        if (referencedMessage?.attachments && referencedMessage.attachments.size > 0) {
            referencedMessage.attachments.forEach(attachment => {
                if (attachment.contentType?.startsWith('image/')) {
                    messageObj.content.push({
                        type: 'input_image',
                        image_url: attachment.url
                    });
                }
            });
        }
    }
    memory[userId].push(messageObj);
    console.log(`[DM] Appended ${messageObj.role} message to user's memory. Current memory length: ${memory[userId].length}`);
}

// Add message to channel memory
function addToChannelMemory(channelId, message) {
    if (!memory[channelId]) {
        memory[channelId] = { history: [], flag: true };
        console.log(`[CHANNEL] New channel memory initialized for ${channelId}`);
    }

    const channelData = memory[channelId];
    function formatMessageText(message) {
        if (message.author?.bot) {
            return message.content;
        }
        
        if (message.reference) {
            const referencedMessage = message.channel.messages.cache.get(message.reference.messageId);
            const replyToUsername = referencedMessage?.author?.username || 'unknown';
            const replyToContent = referencedMessage?.content || '';
            const hasImage = referencedMessage?.attachments?.size > 0;
            const imageText = hasImage ? '[image]' : '';
            const replyText = replyToContent ? `${replyToContent} ${imageText}` : imageText || 'message not found';
            return `${message.author.username}: *Replying to ${replyToUsername}: ${replyText}* ${message.content}`;
        }
        
        return `${message.author.username}: ${message.content}`;
    }

    const messageObj = {
        role: message.author?.bot ? 'assistant' : 'user',
        content: [{
            type: message.author?.bot ? 'output_text' : 'input_text',
            text: formatMessageText(message)
        }],
        timestamp: message.createdTimestamp,
        mentions: message.mentions ? Array.from(message.mentions.users.keys()) : [],
        isReply: message.reference ? true : false,
        replyTo: message.reference ? message.reference.messageId : null
    };

    // Add image attachments only for user messages
    if (!message.author?.bot && message.attachments && message.attachments.size > 0) {
        message.attachments.forEach(attachment => {
            if (attachment.contentType?.startsWith('image/')) {
                messageObj.content.push({
                    type: 'input_image',
                    image_url: attachment.url
                });
            }
        });
    }
    
    // Add image attachments from referenced message if it's a user reply
    if (!message.author?.bot && message.reference) {
        const referencedMessage = message.channel.messages.cache.get(message.reference.messageId);
        if (referencedMessage?.attachments && referencedMessage.attachments.size > 0) {
            referencedMessage.attachments.forEach(attachment => {
                if (attachment.contentType?.startsWith('image/')) {
                    messageObj.content.push({
                        type: 'input_image',
                        image_url: attachment.url
                    });
                }
            });
        }
    }
    channelData.history.push(messageObj);
    if (channelData.history.length > 25) {
        channelData.history.shift();
        // Check if bot was mentioned or replied to in remaining messages
        const hasBotInteraction = channelData.history.some(msg => 
            msg.mentions.includes(message.client.user.id) || 
            (msg.isReply && msg.replyTo && channelData.history.some(m => 
                m.role === 'assistant' && m.messageId === msg.replyTo
            ))
        );
        channelData.flag = hasBotInteraction;
        console.log(`[CHANNEL] Message limit exceeded. Flag updated to: ${hasBotInteraction}`);
    }
    console.log(`[CHANNEL] Appended ${messageObj.role} message to channel memory. History size: ${channelData.history.length}`);
}

// Initialize channel memory if not exists
function initializeChannelMemory(channelId) {
    if (!memory[channelId]) {
        memory[channelId] = { history: [], flag: true };
        console.log(`[CHANNEL] New channel memory initialized for ${channelId}`);
    }
    return memory[channelId];
}

// Set channel flag
function setChannelFlag(channelId, value) {
    if (memory[channelId]) {
        memory[channelId].flag = value;
        console.log(`[CHANNEL] Flag is now: ${value}`);
    }
}

module.exports = {
    loadMemory,
    saveMemory,
    startAutoSave,
    getMemory,
    addToDMMemory,
    addToChannelMemory,
    initializeChannelMemory,
    setChannelFlag
};
