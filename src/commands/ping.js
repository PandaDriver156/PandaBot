const Discord = require('discord.js');

/**
 * @param {Discord.Message} message 
 */
exports.execute = async (message) =>
{
    const msg = await message.channel.send(":table_tennis: Pong!");

    msg.edit(`:table_tennis: Pong! Response time: ${Math.round(msg.createdTimestamp - message.createdTimestamp)}ms, API latency: ${Math.round(message.client.ws.ping)}ms`);
}