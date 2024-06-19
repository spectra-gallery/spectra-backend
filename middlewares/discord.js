const {Client, GatewayIntentBits, EmbedBuilder} = require('discord.js');
require('dotenv').config();

const db = require('../models');
const User = db.user;
const Comment = db.comment;
const Discord = db.discord;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
  ],
});


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

/*
const sendAdminNotification = async (title, message, path) => {
  client.on('ready', () => {
    // get a specific channel
    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);


    // send a message to that channel
    const result = channel.send({
      embeds: [{
        title: title,
        description: message,
        color: 0x00ff00,
        timestamp: new Date(),
      }],
    },
    {
      files: [attachment],
    });
  });
};
*/

const sendNotification = async (title, message, path, url) => {
  // create a new message


  // get a specific channel
  const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);

  const exampleEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(title)
  // .setURL('https://beta.function.gallery/')
      .setDescription(message)
      .setThumbnail(path)
      .setImage(path)
      .setTimestamp();

  // send a message to that channel
  await channel.send({embeds: [exampleEmbed]});
};

const sendMessageToChannel = async (message, channelId, username) => {
  const channel = client
      .channels.cache.get(channelId); // The specific channel ID

  const formatMessage = (message) => {
    return `**${username}**:\n${message}`;
  };

  if (!channel) {
    console.error('Channel not found');
    return;
  }

  /*
  const exampleEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setDescription(message)
      // .setThumbnail(imageUrl)
      .setTimestamp();

  await channel.send({embeds: [exampleEmbed]});
  */

  await channel.send(formatMessage(message));
};

/**
 * Fetches and saves messages from a specified Discord channel.
 *
 * @async
 * @param {string} channelId -
 * The ID of the Discord channel to fetch messages from.
 * @throws Will throw an error if the channel or messages cannot be fetched.
 */
async function fetchAndSaveMessages(channelId) {
  try {
    const channel = await client.channels.fetch(channelId);
    const messages = await
    channel.messages.fetch({limit: 100}); // Adjust limit as needed

    messages.forEach(async (msg) => {
      if (msg.author.bot) return;

      let discord = await Discord.findOne({id: msg.author.id});

      if (!discord) {
        discord = new Discord({
          id: msg.author.id,
          username: msg.author.username,
        });
        await discord.save();
      }
      const _user = await User.findOne({discord: discord._id});

      let comment = await Comment.findOne({id: msg.id});

      if (!comment && msg.content !== '') {
        if (_user) {
          comment = new Comment({
            id: msg.id,
            content: msg.content,
            discord: discord._id,
            date: msg.createdAt,
            author: _user._id || null,
          });
        } else {
          comment = new Comment({
            id: msg.id,
            content: msg.content,
            discord: discord._id,
            date: msg.createdAt,
          });
        }

        await comment.save();

        const user = await User.findOne({channelId: channelId});

        user.comments.push(comment._id);
        await user.save();
      }
    });
  } catch (error) {
    console.error('Error fetching and saving messages:', error);
  }
}

client.login(process.env.DISCORD_TOKEN);

const discord = {
  sendNotification,
  fetchAndSaveMessages,
  sendMessageToChannel,
};
module.exports = discord;
