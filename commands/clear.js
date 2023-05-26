// Require the slash command builder
const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('replitdb-client');

const dbClient = new db('https://kv.replit.com/v0/eyJhbGciOiJIUzUxMiIsImlzcyI6ImNvbm1hbiIsImtpZCI6InByb2Q6MSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjb25tYW4iLCJleHAiOjE2ODUyNDc1ODQsImlhdCI6MTY4NTEzNTk4NCwiZGF0YWJhc2VfaWQiOiI2ODZmMjAzYS1mMzZhLTRlZTUtYjQwNy0yZjgyZTRhYmY4MzQiLCJ1c2VyIjoiRmlnaThDYWtlIiwic2x1ZyI6IkpzbWFuLUJvdCJ9.KxNYI4ewByZ2LSSuHQ2uvcu6vIHxSTkzuqoZ36G40PaBLC-zDeyCpiPcQBGr6AvpaPt5PDUwsvHkl2XzoCxACg');
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