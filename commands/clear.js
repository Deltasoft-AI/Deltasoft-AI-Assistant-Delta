// Require necessary modules
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getMemory } = require('../utils/memory');

// Export as a module for other files to require()
module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear the chat history')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const memory = getMemory();
    const isDM = !interaction.guildId;
    const userId = interaction.user.id;
    const channelId = interaction.channelId;

    // Check permissions for guild channels
    if (!isDM && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ You need Administrator permissions to clear channel memory!',
        ephemeral: true
      });
    }

    // Clear appropriate memory
    if (isDM) {
      memory[userId] = [];
    } else {
      memory[channelId] = { history: [], flag: true };
    }

    return interaction.reply({
      content: '🔁 Chat history cleared successfully! The bot will start fresh from here.',
      ephemeral: true
    });
  },
};