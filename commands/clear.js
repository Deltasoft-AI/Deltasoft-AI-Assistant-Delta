// Require the slash command builder
const { SlashCommandBuilder } = require('@discordjs/builders');
const fsPromises = require("fs").promises;
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
async function resetThread(user) {
  console.log('attemping to reset user');
  try {
    let userObject = await getDb(user);
   // console.log('user object: '+JSON.stringify(userObject, null, 4));
    userObject.thread_id = null;
  //  console.log('new user object: '+JSON.stringify(userObject, null, 4));
    db.set(user, JSON.stringify(userObject));
  } catch (error) {
    console.log('An error occured trying to delete a user: '+error);
  }
}

// Export as a module for other files to require()
module.exports = {
  data: new SlashCommandBuilder() // command details
    .setName('clear')
    .setDescription('Clear the chat history'),
  async execute(interaction) { // command functions
    resetThread(interaction.user.id);
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