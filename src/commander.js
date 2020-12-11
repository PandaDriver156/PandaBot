const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');

const { AccessLevels } = require('./constants');

class Commander
{
    /**
     * @param {object} options
     * @param {Discord.Client} options.client
     * @param {string} options.prefix
     * @param {fs.PathLike} options.path
     * @param {boolean} [options.allowBots=false]
     * @param {Array<Discord.Snowflake>} [options.allowedUsers=[]]
     */
    constructor(options)
    {
        this.client = options.client;
        this.prefix = options.prefix;
        this.path = options.path;
        this.allowBots = options.allowBots != undefined ? options.allowBots : false;
        this.allowedUsers = options.allowedUsers || null;
        /**
         * @type {Map<string,object>}
         */
        this.commands = new Map();

        this.client.on('message', this._handleMessage.bind(this));
        this.load();
    }

    load()
    {
        const commands = fs.readdirSync(this.path);

        for (const commandPath of commands)
        {
            if (!commandPath.endsWith('.js')) return;
            const command = require(path.join(this.path, commandPath));
            const commandName = command.info?.name || commandPath.slice(0, -3);
            this.commands.set(commandName, command);
        }
    }

    get(key)
    {
        return this.commands.get(key);
    }

    has(key)
    {
        return this.commands.has(key);
    }

    /**
     * @param {Function<object>} cb 
     */
    find(cb)
    {
        for (const [name, command] of this.commands)
        {
            if (cb(command)) return command;
        }
        return null;
    }

    get count()
    {
        return this.commands.size;
    }

    /**
     * @param {Discord.Message} message 
     */
    async _handleMessage(message)
    {
        if (!message.content.startsWith(this.prefix)) return;
        if (message.author.bot && !this.allowBots) return;

        const args = message.content.slice(this.prefix.length).trim().split(/ +/g);
        const commandName = args.shift().toLowerCase();

        const command = this.get(commandName) || this.find(c => c.info?.aliases?.some(alias => alias === commandName));

        if (command)
        {
            if (this.allowedUsers && !this.allowedUsers.some(userID => userID === message.author.id)) return;
            try
            {
                await command.execute(message, args);
            }
            catch (err)
            {
                message.channel.send(`:question: An error occured while running the command \`${commandName}\`: \`${err.message}\``);
                console.error(err);
            }
        }
    }
}

module.exports = Commander;