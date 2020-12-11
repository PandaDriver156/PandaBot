const util = require('util');
const Discord = require('discord.js');
const { join } = require('path');

/**
 * @param {Discord.Message} message 
 * @param {string[]} args
 */
exports.execute = async (message, args) =>
{
    const code = args.join(' ');
    try
    {
        let evaled = args.length ? eval(code) : null;

        if (evaled?.constructor === Promise)
            evaled = await evaled;

        const cleaned = clean(typeof evaled === "string" ? evaled : util.inspect(evaled));

        await message.channel.send(`\`\`\`${cleaned}\`\`\``);
    }
    catch (err)
    {
        message.channel.send(`\`Error\`\n\`\`\`${clean(err)}\`\`\``);
    }
}

/**
 * @param {string} text 
 */
function clean(text)
{
    if (typeof text === "string")
        return text
            .replace("`", "`" + String.fromCharCode(8203))
            .replace("@", "@" + String.fromCharCode(8203));
    return text;
}
