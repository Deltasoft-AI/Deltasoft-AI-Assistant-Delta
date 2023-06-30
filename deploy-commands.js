// Require necessary files
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const token = process.env['DISCORD_TOKEN'];
const clientId = process.env['CLIENT_ID'];
const fs = require('node:fs');

// Find all commands
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

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
})();

// Use Routes.applicationCommands(clientId) to register global commands (NOTE: global commands take ONE HOUR to update)
