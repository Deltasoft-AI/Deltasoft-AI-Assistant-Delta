// Require necessary files
const { REST } = require('@discordjs/rest');
require("dotenv").config();
const { Routes } = require('discord-api-types/v9');
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const fs = require('node:fs');

// Find all commands
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  if (file !== 'ask-deltasoft.js') { // Exclude the specific command
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
  }
}
/*
const specificCommand = require('./commands/ask-deltasoft.js'); // Update the path
const guildId = '1081208082530570240'; // Replace with the actual guild ID
console.log(clientId);
*/

// Register the commands
const rest = new REST({ version: '9' }).setToken(token);
(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
  /*
  try {
    console.log(`Deploying specific command to guild ${guildId}.`);

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: [specificCommand.data.toJSON()] },
    );

    console.log(`Successfully deployed specific command to guild ${guildId}.`);
  } catch (error) {
    console.error(error);
  }
  */
})();

// Use Routes.applicationCommands(clientId) to register global commands (NOTE: global commands take ONE HOUR to update)





