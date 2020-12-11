const fs = require('fs');
const Discord = require('discord.js');

const utility = require('../utility.js');

/**
 * @param {Discord.Message} message 
 */
exports.execute = async (message, args) =>
{
    const action = args[0];
    switch (action)
    {
        case "create":
            const guildData = await utility.getGuildData(message.guild);

            if (!fs.existsSync('backups'))
                fs.mkdirSync('backups');

            fs.writeFileSync(`backups/${message.guild.id}.json`, JSON.stringify(guildData));
            message.channel.send("Backup complete.");
            break;
        default:
            message.channel.send(":x: Invalid or no action provided.");
            break;
    }
}