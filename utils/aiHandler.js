const { OpenAI } = require('openai');
const openaiClient = new OpenAI();
const { getMemory, addToDMMemory, addToChannelMemory } = require('./memory');

// Function to condense long messages
async function condenseLongMessage(message) {
    await message.channel.sendTyping();
    try {
        const response = await openaiClient.responses.create({
            model: 'gpt-4o-mini',
            input: [{
                role: 'user',
                content: [{
                    type: 'input_text',
                    text: `Please condense the following message to be under 2000 characters while maintaining the key information and tone: \n\n${message}`
                }]
            }],
            instructions: 'You are a message condenser. Your task is to shorten the given message while preserving its main points and maintaining the same tone and style. The output must be under 2000 characters.'
        });
        return response.output_text;
    } catch (err) {
        console.error('[condenseLongMessage] ERROR:', err);
        return message.substring(0, 1900) + '\n... (message truncated due to length)';
    }
}



// Handles sending input and context to OpenAI and replying to the user
async function handleAIResponse(message, history, replyContext, mode, memoryResetNote = '') {
    try {
        console.log(`[handleAIResponse] Triggered for ${mode.toUpperCase()} - User: ${message.author.username}`);

        await message.channel.sendTyping();

        const deltaInput = [];

        // Add memory reset note if applicable
        if (memoryResetNote) {
            deltaInput.push({
                role: 'user',
                content: [{ type: 'input_text', text: memoryResetNote }]
            });
            console.log(`[handleAIResponse] Added memory reset note to input`);
        }

        // Process history messages
        console.log(`[handleAIResponse] Processing ${history.length} messages from history`);
        
        let currentUser = null;
        let currentUserMessages = [];

        const flushCurrentUser = () => {
            if (currentUser && currentUserMessages.length > 0) {
                // Filter out image content for assistant messages
                if (currentUser.role === 'assistant') {
                    currentUserMessages = currentUserMessages.filter(msg => msg.type !== 'input_image');
                }
                deltaInput.push({
                    role: currentUser.role,
                    content: currentUserMessages
                });
                currentUserMessages = [];
            }
        };

        history.forEach(msg => {
            const role = msg.role || (msg.author?.bot ? 'assistant' : 'user');
            let messageContent;
            let messageText = msg.content;

            // Add reply context if message is a reply
            if (msg.isReply && msg.replyTo) {
                const repliedTo = history.find(m => m.messageId === msg.replyTo);
                if (repliedTo) {
                    messageText = `Context: Replying to "${repliedTo.content[0].text}"
${messageText}`;
                    
                    // Include any images from the replied message
                    if (Array.isArray(repliedTo.content)) {
                        const imageAttachments = repliedTo.content.filter(item => 
                            item.type === 'input_image' || 
                            (item.type === 'output_image' && item.image_url)
                        );
                        if (imageAttachments.length > 0) {
                            if (!Array.isArray(messageContent)) {
                                messageContent = [{ type: 'input_text', text: messageText }];
                            }
                            messageContent.push(...imageAttachments);
                        }
                    }
                }
            }

            if (msg.role === 'assistant') {
                flushCurrentUser();
                messageContent = Array.isArray(msg.content) ? msg.content : [{
                    type: 'output_text',
                    text: messageText
                }];
                deltaInput.push({ role, content: messageContent });
            } else {
                messageContent = Array.isArray(msg.content) ? msg.content : [{
                    type: 'input_text',
                    text: messageText
                }];

                if (!currentUser || currentUser.role !== role) {
                    flushCurrentUser();
                    currentUser = { role };
                }
                currentUserMessages.push(...messageContent);
            }
        });

        flushCurrentUser();
      


        // Add current user message with reply context if applicable
        if (!history.some(msg => msg.timestamp === message.createdTimestamp)) {
            console.log(`[handleAIResponse] Adding current user message${replyContext ? ' with reply context' : ''}`);
            const messageText = replyContext 
                ? `Context: ${replyContext}\n${message.author.username}: ${message.content}`
                : `${message.author.username}: ${message.content}`;
            const messageContent = [{
                type: 'input_text',
                text: messageText
            }];

            // Add image attachments if present
            if (message.attachments && message.attachments.size > 0) {
                message.attachments.forEach(attachment => {
                    if (attachment.contentType?.startsWith('image/')) {
                        messageContent.push({
                            type: 'input_image',
                            image_url: attachment.url
                        });
                    }
                });
            }

            deltaInput.push({
                role: 'user',
                content: messageContent
            });
        }

        console.log("\nhere is what is really being sent to the ai:\n"+JSON.stringify(deltaInput, null, 2)+"\n");
        const response = await openaiClient.responses.create({
            model: 'gpt-4o-mini',
            input: deltaInput,
            tools: [{ type: "web_search_preview" }],
            instructions: `You are Delta -- Beta v1.0, a friendly and engaging AI assistant working in ${mode === 'dm' ? 'DM' : 'Channel'} mode. When users mention you using <@1108086680818298910>, understand that they are directly addressing you as Delta -- Beta v1.0, and you may also mention yourself this way.
Personality: Be personalble and semi-informal. When asked to write specific text or essays: use a more formal tone and focus on clarity and consiseness.`
        });

        console.log(`[handleAIResponse] AI response generated, checking length.`);
        console.log('[handleAIResponse] AI Response:', response.output_text);

        let finalResponse = response.output_text;
        if (finalResponse.length > 2000) {
            console.log('[handleAIResponse] Response exceeds 2000 characters, condensing...');
            finalResponse = await condenseLongMessage(finalResponse);
            console.log('[handleAIResponse] Condensed response:', finalResponse);
        }

        // Send the response to the user
        const botReply = await message.reply(finalResponse);
        
        // Create a new message object for the AI's response
        const aiMessage = {
            role: 'assistant',
            content: [{
                type: 'output_text',
                text: finalResponse
            }]
        };
        deltaInput.push(aiMessage);

        // Log complete conversation history including AI's response
        console.log('[handleAIResponse] Complete conversation history including AI response:');
        console.log(JSON.stringify(deltaInput, null, 2));

        // Add bot's response to history and log memory update
        console.log(`[handleAIResponse] Updating ${mode.toUpperCase()} memory with bot's response`);
        if (mode === 'dm') {
            const userId = message.author.id;
            addToDMMemory(userId, botReply);
        } else {
            const channelId = message.channel.id;
            addToChannelMemory(channelId, botReply);
        }

    } catch (err) {
        console.error(`[handleAIResponse] ERROR:`, err);
        await message.reply('Something went wrong processing your request.');
    }
}

// Fetch context of the replied-to message
async function fetchReplyContext(message) {
    try {
        console.log(`[fetchReplyContext] Fetching replied message for message ID: ${message.reference.messageId}`);
        const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
        if (repliedMessage) {
            console.log(`[fetchReplyContext] Fetched content: ${repliedMessage.content}`);
            return `Replying to ${repliedMessage.author.username}'s message: "${repliedMessage.content}"`;            
        } else {
            console.log(`[fetchReplyContext] No replied message found`);
            return null;
        }
    } catch (e) {
        console.error(`[fetchReplyContext] ERROR fetching reply context:`, e);
        return null;
    }
}

// Check if a message is replying to the bot


async function isReplyToBot(message) {
    try {
        const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
        const isBotReply = repliedMessage.author.id === message.client.user.id;
        console.log(`[isReplyToBot] Is reply to bot? ${isBotReply}`);
        return isBotReply;
    } catch (err) {
        console.error(`[isReplyToBot] ERROR:`, err);
        return false;
    }
}

module.exports = {
    handleAIResponse,
    fetchReplyContext,
    isReplyToBot
};
