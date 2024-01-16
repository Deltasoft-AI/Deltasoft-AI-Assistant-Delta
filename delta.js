// Import required packages
const Discord = require("discord.js");
const {
    MessageEmbed,
    Permissions,
    Client,
    Collection,
    Intents,
    EmbedBuilder,
    GuildManager,
    ChannelType,
    MessageAttachment,
    PermissionsBitField,
    GatewayIntentBits
} = require("discord.js");
const fs = require("node:fs");
const fsPromises = require("fs").promises;
const path = require("node:path");
require("dotenv").config();
const { createClient } = require('redis');

const db = createClient({
    password: process.env.REDIS_PW,
    socket: {
        host: 'redis-15284.c321.us-east-1-2.ec2.cloud.redislabs.com',
        port: 15284
    }
});

async function connectDb() {
    await db.connect();
} connectDb();

async function getDb(input) {
    const value = await db.get(input);
    return JSON.parse(value);
}

async function test() {
    //console.log((await getDb('916043469552758784')));
    //await db.connect();
    //await db.set('916043469552758784',JSON.stringify(json))
    //const value = await db.get('916043469552758784');
    // console.log(JSON.parse(value));
} test();

const OpenAI = require("openai");

// Create a OpenAI connection
const secretKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
    apiKey: secretKey,
});

// Create new Discord client
const client = new Discord.Client({
    intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS", "DIRECT_MESSAGES"],
    partials: ["CHANNEL"],
});

//Read commands from /commands folder
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// Dynamically execute commands
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    console.log('-- ' + interaction.user.username + ' used /' + interaction.commandName)

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
        });
    }
});

// Client login
client.login(
    process.env.DISCORD_TOKEN
);

// When logged in, set activity
client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity("for /clear", { type: "WATCHING" });
});

// When a user creates a message
client.on("messageCreate", async (message) => {
    if (message.author.bot || message.author.id != "916043469552758784") {
        return; // Ignore messages from bots
    }

    // Handle direct messages
    if (message.channel.type === "DM") {
        handleDirectMessage(message);
    }

    // Handle messages in specific channels
    if (message.channel.name === "delta-beta-chat") {
        handleChannelMessage(message);
    }
});

async function handleDirectMessage(message) {
    if (message.attachments.size > 0 || message.stickers.size >= 1) {
        message.channel.sendTyping();

        const upgradeMessage = "Please upgrade to process stickers or attachments. (**Upgrade not available at this time**)";
        const replyMessage = message.content === "" ? upgradeMessage : `${upgradeMessage}\n Please re-send your message without the attachment.`;

        message.reply(replyMessage);
    } else {
        message.channel.sendTyping();
        let content = await generate(message.content, message);
        if (content.length > 2000) {
            const file = new MessageAttachment(Buffer.from(content), `output.txt`);
            message.channel.send({
                content:
                    'The content of my response was too large to fit in a standard Discord message, so i\'ve put it into a text document for you! :smile:',
                files: [file]
            }
            )
        } else {
            message.channel.send(content);
        }
    }
}

async function handleChannelMessage(message) {
    if (message.attachments.size > 0 || message.stickers.size >= 1) {
        message.channel.sendTyping();

        const upgradeMessage = "Please upgrade to process stickers or attachments. (**Upgrade not available at this time**)";
        const replyMessage = message.content === "" ? upgradeMessage : `${upgradeMessage}\n Please re-send your message without the attachment.`;

        message.reply(replyMessage);
    } else {
        message.channel.sendTyping();
        let content = await generate(message.content, message);
        if (content.length > 2000) {
            const file = new MessageAttachment(Buffer.from(content), `output.txt`);
            message.channel.send({
                content:
                    'The content of my response was too large to fit in a standard Discord message, so i\'ve put it into a text document for you! :smile:',
                files: [file]
            }
            )
        } else {
            message.channel.send(content);
        }
    }
}


// START GENERATE FUNCTION
const assistantId_standard = process.env.assistantId_standard;
const assistantId_plus = process.env.assistantId_plus;
const assistantId_creative = process.env.assistantId_creative;
const assistantId_pro = process.env.assistantId_pro;



const generate = async (userInput, message) => {
    let userInfo = await getDb(message.author.id)
    //console.log(userInfo);
    let thread;
    let details = null;
    if (userInfo == null) {
        thread = await openai.beta.threads.create();
        details = "User Info: Username: " + message.author.username + ". To ping the user, type: <@" + message.author.id + ">. This user has the Free Tier. They can upgrade for more features."
        const json = {
            "id": message.author.id,
            "preferred_model": "gpt-3.5",
            "username": message.author.username,
            "tier": "standard",
            "thread_id": thread.id
        }
        db.set(message.author.id, JSON.stringify(json))
    } else if (userInfo.thread_id == null) {
        thread = await openai.beta.threads.create();
        details = "You are talking to " + message.author.username + ". To ping the user, type: <@" + message.author.id + ">"
       // console.log('old thread:' + JSON.stringify(userInfo, null, 4));
        userInfo.thread_id = thread.id;
       // console.log('new thread:' + JSON.stringify(userInfo, null, 4));
        db.set(message.author.id, JSON.stringify(userInfo))
    } else if (userInfo.thread_id != null) {
        thread = await openai.beta.threads.retrieve(
            userInfo.thread_id
        );
    } else {
        console.log('an unexpected error occured');
    }

    await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: userInput,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId_standard,
        additional_instructions: details
    });

    let runStatus = await openai.beta.threads.runs.retrieve(
        thread.id,
        run.id
    );

    // Polling mechanism to see if runStatus is completed
    while (runStatus.status !== "completed") {
        await new Promise((resolve) => setTimeout(resolve, 500));
        runStatus = await openai.beta.threads.runs.retrieve(
            thread.id,
            run.id
        );
        console.log(runStatus.status);
        if (runStatus.status == "in_progress") {
            message.channel.sendTyping();
        }
        // Check for failed, cancelled, or expired status
        if (["failed", "cancelled", "expired"].includes(runStatus.status)) {
            console.log(
                `Run status is '${runStatus.status}'. Unable to complete the request.`
            );
            break; // Exit the loop if the status indicates a failure or cancellation
        }
    }

    /* const runStep = await openai.beta.threads.runs.steps.retrieve(
         thread.id,
         run.id
     );
     console.log(runStep);*/

    // Get the last assistant message from the messages array
    const messages = await openai.beta.threads.messages.list(thread.id);

    // Find the last message for the current run
    const lastMessageForRun = messages.data
        .filter(
            (message) =>
                message.run_id === run.id && message.role === "assistant"
        )
        .pop();

    // If an assistant message is found, console.log() it
    if (lastMessageForRun) {
        //console.log(`${lastMessageForRun.content[0].text.value} \n`);
        return (lastMessageForRun.content[0].text.value);
    } else if (
        !["failed", "cancelled", "expired"].includes(runStatus.status)
    ) {
        console.log("No response received from the assistant.");
    }
}



