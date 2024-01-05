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
const { MongoClient } = require("mongodb");
// Replace the uri string with your connection string.
const uri = process.env.MONGODB_URI;
const dbClient = new MongoClient(uri);
const db = dbClient.db(process.env.MONGODB_DB);

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

    console.log('-- ' + interaction.user.tag + ' used /' + interaction.commandName)

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
        if (content.length > 2000){
            const file = new MessageAttachment(Buffer.from(content), `output.txt`);
            message.channel.send({
                content:
                    'The content of my response was too large to fit in a standard Discord message, so i\'ve put it into a text document for you! :smile:',
                files: [file]
            }
            )
        } else{
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
        if (content.length > 2000){
            const file = new MessageAttachment(Buffer.from(content), `output.txt`);
            message.channel.send({
                content:
                    'The content of my response was too large to fit in a standard Discord message, so i\'ve put it into a text document for you! :smile:',
                files: [file]
            }
            )
        } else{
            message.channel.send(content);
        }
    }
}


// START GENERATE FUNCTION
const assistantId_beta_freeTier = process.env.assistantId_beta_freeTier;



const generate = async (userInput, message) => {
    const userData = await fsPromises.readFile(
        "./users.json",
        "utf8"
    );
    let userInfo = JSON.parse(userData);
    let thread;
    let details = null;
    if (userInfo[message.author.id]) {
        thread = await openai.beta.threads.retrieve(
            userInfo[message.author.id]
        );
    } else {
        thread = await openai.beta.threads.create();
        details = "User Info: Username: " + message.author.username + ". To ping the user, type: <@" + message.author.id + ">. This user has the Free Tier. They can upgrade for more features."
        let newUserInfo = {
            [message.author.id]: thread.id,
            ...userInfo
        }
        await fsPromises.writeFile(
            "./users.json",
            JSON.stringify(newUserInfo, null, 2)
        );
    }

    await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: userInput,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId_beta_freeTier,
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
        if (runStatus.status == "in_progress"){
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



