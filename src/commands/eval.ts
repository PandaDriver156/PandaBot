import * as util from "util";
import * as Discord from "discord.js";
import { AccessLevels, BaseCommand, Colors, Message } from "../types";

export default class EvalCommand implements BaseCommand
{
    async execute(message: Message, args: string[])
    {
        const code = args.join(' ');
        try
        {
            let evaled = args.length ? eval(code) : null;

            if (evaled?.constructor === Promise)
                evaled = await evaled;

            const cleaned = clean(typeof evaled === "string" ? evaled : util.inspect(evaled));

            const embed = new Discord.MessageEmbed()
                .setColor(message.guild.me.displayColor || Colors.lightBlue)
                .setTitle(":outbox_tray: Output:")
                .setDescription(`\`\`\`xl\n${cleaned}\`\`\``)
                .setTimestamp();

            await message.channel.send(embed);
        }
        catch (err)
        {
            message.channel.send(`\`Error\`\n\`\`\`${clean(err)}\`\`\``);
        }
    }

    info = {
        level: AccessLevels.BotOwner
    }
}
export async function execute(message: Message, args: string[])
{
    const code = args.join(' ');
    try
    {
        let evaled = args.length ? eval(code) : null;

        if (evaled?.constructor === Promise)
            evaled = await evaled;

        const cleaned = clean(typeof evaled === "string" ? evaled : util.inspect(evaled));

        const embed = new Discord.MessageEmbed()
            .setColor(message.guild.me.displayColor || Colors.lightBlue)
            .setTitle(":outbox_tray: Output:")
            .setDescription(`\`\`\`xl\n${cleaned}\`\`\``)
            .setTimestamp();

        await message.channel.send(embed);
    }
    catch (err)
    {
        message.channel.send(`\`Error\`\n\`\`\`${clean(err)}\`\`\``);
    }
}

function clean(text: string): string
{
    if (typeof text === "string")
        return text
            .replace("`", "`" + String.fromCharCode(8203))
            .replace("@", "@" + String.fromCharCode(8203));
    return text;
}
