import * as fs from "fs";
import { AccessLevels, BaseCommand } from "../types"

const command: BaseCommand = {
    async execute(message, args)
    {
        const { commander } = message.client;
        let commandName = args[0];
        let isNewCommand = false;

        if (!commandName) return message.channel.send(":x: No command specified.");

        let command = commander.get(commandName) || commander.find(c => c.info?.aliases?.some(alias =>
        {
            if (alias === commandName)
            {
                commandName = alias;
                return true;
            }
        }));

        if (!command)
        {
            if (fs.existsSync(`${__dirname}/${commandName}.js`)) isNewCommand = true;
            else return message.channel.send(":x: No command found with that name.");
        }

        delete require.cache[require.resolve(`./${commandName}.js`)];

        commander.delete(commandName);
        const imported = await import(`./${commandName}.js`);
        command = imported.default ? imported.default : imported;
        commander.set(commandName, command);

        if (isNewCommand) message.channel.send(`:white_check_mark: Command \`${commandName}\` was loaded.`);
        else message.channel.send(`:arrows_counterclockwise: Command \`${commandName}\` was reloaded.`);
    },

    info: {
        aliases: ["load"],
        level: AccessLevels.BotModerator
    }
};

export default command;
