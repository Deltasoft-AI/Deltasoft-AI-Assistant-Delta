// Require the slash command builder
const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('replitdb-client');

const dbClient = new db('https://kv.replit.com/v0/eyJhbGciOiJIUzUxMiIsImlzcyI6ImNvbm1hbiIsImtpZCI6InByb2Q6MSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjb25tYW4iLCJleHAiOjE2ODQ1NTc2NjUsImlhdCI6MTY4NDQ0NjA2NSwiZGF0YWJhc2VfaWQiOiI2ODZmMjAzYS1mMzZhLTRlZTUtYjQwNy0yZjgyZTRhYmY4MzQiLCJ1c2VyIjoiRmlnaThDYWtlIiwic2x1ZyI6IkpzbWFuLUJvdCJ9.w00u5JZuDPLXQ7sOYufaKASUUMwcWiUAt6xcZmereq3UkFX7Oxa5GA4iUBIXSPqDeNvHPls1mDcuC9q-NXxnOw');
// Export as a module for other files to require()
module.exports = {
  data: new SlashCommandBuilder() // command details
    .setName('clear')
    .setDescription('Clear the chat history'),
  async execute(interaction) { // command functions
    dbClient.delete(interaction.user.id);
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
      timestamp: new Date().toISOString(),
    };
  
    return interaction.reply({ embeds: [exampleEmbed] });
  },
};