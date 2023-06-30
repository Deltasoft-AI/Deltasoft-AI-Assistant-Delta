// Require the slash command builder
const { SlashCommandBuilder } = require('@discordjs/builders');
const Database = require("@replit/database");
const db = new Database()
// Export as a module for other files to require()
module.exports = {
  data: new SlashCommandBuilder() // command details
    .setName('clear')
    .setDescription('Clear the chat history'),
  async execute(interaction) { // command functions
    db.delete(interaction.user.id);
  const exampleEmbed = {
      color: 12114155,
      author: {
        name: 'Deltasoft AI',
      },
      fields: [
        {
          name: 'Chat Sucessfully Cleared! 🔁',
          value: 'Your chat history has been cleared and the bot will forget this conversation.',
        },
      ],
      image: {
        url: 'https://i.ibb.co/L54bfvs/reset.png',
      },
      timestamp: new Date().toISOString(),
    };
    return interaction.reply({ embeds: [exampleEmbed], ephemeral: true });
  },
};
