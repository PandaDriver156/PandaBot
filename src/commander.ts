import * as fs from "fs";
import * as path from "path";
import { BaseCommand, AccessLevels, GuildMember, Message } from "./types";
import { Client, } from "./client"
import { Snowflake } from "discord.js";

export interface CommanderOptions
{
    client: Client,
    prefix: string,
    path: string,
    allowBots: boolean
}

export const permLevelChecks =
    [
        {
            name: "User",
            level: AccessLevels.User,
            check: () => true
        },
        {
            name: "Moderator",
            level: AccessLevels.Moderator,
            check: (user: GuildMember) =>
                user.permissions.has("MANAGE_CHANNELS") ||
                user.permissions.has("MANAGE_MESSAGES") ||
                user.permissions.has("MANAGE_GUILD") ||
                user.permissions.has("MANAGE_ROLES")
        },
        {
            name: "Administrator",
            level: AccessLevels.Administrator,
            check: (user: GuildMember) => user.permissions.has("ADMINISTRATOR")
        },
        {
            name: "Server Owner",
            level: AccessLevels.ServerOwner,
            check: (user: GuildMember) => user.id === user.guild.ownerID
        },
        {
            name: "Bot Moderator",
            level: AccessLevels.BotModerator,
            check: () => false // not implemented yet
        },
        {
            name: "Bot Admin",
            level: AccessLevels.BotAdmin,
            check: () => false // not implemented yet
        },
        {
            name: "Bot Owner",
            level: AccessLevels.BotOwner,
            check: (user: GuildMember) => user.id === user.client.config.permLevels.BotOwner
        }
    ];

export function checkUserLevel(user: GuildMember)
{
    const levels = permLevelChecks.sort(() => 1);

    let highestLevel: typeof levels[0];


    for (const [permName, users] of Object.entries(user.client.config.permLevels))
    {
        if (users.includes(user.id))
        {
            highestLevel = levels.find(permLvl => permLvl.level === AccessLevels[permName as (keyof typeof AccessLevels)]);
        }
    }

    if (user.client.config.allowNotSpecifiedUsers)
    {
        for (const level of levels)
        {
            if (level.check(user))
            {
                highestLevel = level;
                break;
            }
        }
    }

    return highestLevel;
}

export class Commander
{
    public client: Client;
    public commands: Map<string, BaseCommand>;
    public readonly path: string;
    public allowBots?: boolean;
    public allowedUsers?: Snowflake[];
    public prefix: string;

    constructor(options: CommanderOptions)
    {
        this.client = options.client;
        this.prefix = options.prefix;
        this.path = options.path;
        this.allowBots = options.allowBots != undefined ? options.allowBots : false;
        this.commands = new Map();

        this.client.on('message', this.handleMessage.bind(this));
        this.load();
    }

    async load()
    {
        const commands = fs.readdirSync(this.path);

        for (const commandPath of commands)
        {
            try
            {
                if (!commandPath.endsWith('.js')) return;
                const commandImport = await import(path.join(this.path, commandPath));
                const commandClass: typeof BaseCommand = commandImport.default ? commandImport.default : commandImport;
                const command = new commandClass();
                const commandName = command.info?.name || commandPath.slice(0, -3);
                this.set(commandName, command);
            } catch (error)
            {
                console.error(`Command ${commandPath} failed to load!`);
                console.error(error);
            }
        }
    }

    handleMessage(message: Message)
    {
        if (!message.content.startsWith(this.prefix)) return;
        if (message.author.bot && !this.allowBots) return;

        const args = message.content.slice(this.prefix.length).trim().split(/ +/g);
        const commandName = args.shift().toLowerCase();

        const command = this.get(commandName) || this.find(c => c.info?.aliases?.some(alias => alias === commandName));

        if (command)
        {
            const commandPermLevel = command.info?.level || 1;
            if (checkUserLevel(message.member).level < commandPermLevel) return;
            try
            {
                command.execute(message, args);
            }
            catch (err)
            {
                message.channel.send(`:question: An error occured while running the command.`);
                console.error(err);
            }
        }
    }

    set(key: string, value: any)
    {
        return this.commands.set(key, value);
    }

    get(key: string)
    {
        return this.commands.get(key);
    }

    has(key: string)
    {
        return this.commands.has(key);
    }

    find(cb: (command: BaseCommand) => boolean): BaseCommand
    {
        for (const [name, command] of this.commands)
        {
            if (cb(command)) return command;
        }
        return null;
    }

    delete(key: string)
    {
        return this.commands.delete(key);
    }

    get count()
    {
        return this.commands.size;
    }
}