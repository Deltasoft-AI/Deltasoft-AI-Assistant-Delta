// Require the slash command builder
const { SlashCommandBuilder } = require('@discordjs/builders');
const fsPromises = require("fs").promises;

async function deleteDocument(user) {
        // Read the JSON file
        const data = await fsPromises.readFile("./users.json", 'utf-8');
        const jsonData = JSON.parse(data);

        // Check if the key exists
        if (jsonData.hasOwnProperty(user)) {
            // Delete the key
            delete jsonData[user];

            // Write the updated JSON back to the file
            await fsPromises.writeFile("./users.json", JSON.stringify(jsonData, null, 2));

        } else {
            console.log(`Error occured deleting from JSON file`);
        }
  }

// Export as a module for other files to require()
module.exports = {
  data: new SlashCommandBuilder() // command details
    .setName('clear')
    .setDescription('Clear the chat history'),
  async execute(interaction) { // command functions
    deleteDocument(interaction.user.id);
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