const fs = require('fs');
const Discord = require('discord.js');

/**
 * @param {Discord.Message} message 
 * @param {string[]} args 
 */
exports.execute = (message, args) =>
{
    let commandName = args[0];
    let newCommand = false;

    if (!commandName) return message.channel.send(":x: No command specified.");

    const { commander } = message.client.program;

    let command = commander.get(commandName) || commander.find(c => c.aliases?.some(a =>
    {
        if (a === commandName)
        {
            commandName = a;
            return true;
        }
    }));

    if (!command)
    {
        if (fs.existsSync(`${__dirname}/${commandName}.js`)) newCommand = true;
        else return message.channel.send(":x: No command found with that name.");
    }

    delete require.cache[require.resolve(`./${commandName}.js`)];

    commander.delete(commandName);
    command = require(`./${commandName}.js`);
    commander.set(commandName, command);

    if (newCommand) message.channel.send(`:white_check_mark: Command \`${commandName}\` was loaded.`);
    else message.channel.send(`:arrows_counterclockwise: Command \`${commandName}\` was reloaded.`);
};

exports.info = {
    aliases: ["load"]
};
