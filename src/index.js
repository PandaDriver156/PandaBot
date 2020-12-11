const path = require('path');
const Discord = require('discord.js');

const VoiceHandler = require('./voice.js');
const Commander = require('./commander.js');
const Intents = Discord.Intents.FLAGS;
const config = require('../config.json');

class Program
{
    static Main()
    {
        this.client = new Discord.Client({
            ws: {
                intents: [
                    Intents.GUILDS,
                    Intents.GUILD_MEMBERS,
                    Intents.GUILD_MESSAGES,
                    Intents.GUILD_PRESENCES,
                    Intents.GUILD_VOICE_STATES
                ]
            },
            presence: {
                status: 'invisible'
            },
            fetchAllMembers: true
        });
        this.client.on('ready', this.onReady.bind(this));
        this.voice = new VoiceHandler(this.client, config.main_user_id);
        this.commander = new Commander({
            client: this.client,
            prefix: config.prefix,
            path: path.join(__dirname, 'commands'),
            allowBots: false,
            allowedUsers: config.allowed_users
        });

        process.on('SIGINT', this.onExit.bind(this));
        this.client.on('presenceUpdate', this.updatePresence.bind(this, false));
        this.client.login(config.token);
    }

    static onReady()
    {
        console.log("Ready!");

        // this.client.mainUser = await this.client.users.fetch(config.main_user_id);
        this.client.mainUser = this.client.users.cache.get(config.main_user_id);

        this.updatePresence(true);
    }

    /**
    * @param {Discord.Presence} oldPresence 
    * @param {Discord.Presence} newPresence 
    */
    static onPresenceUpdate(oldPresence, newPresence)
    {
        if (newPresence.userID === this.client.mainUser.id)
            this.updatePresence(false);
    }

    /**
     * @param {boolean} isFirst 
     */
    static async updatePresence(isFirst = false)
    {
        const userStatus = this.client.mainUser.presence.status;
        if (userStatus === this.client.user.presence.status && !isFirst) return;
        await this.client.user.setStatus(userStatus === 'offline' ? 'invisible' : userStatus);
    }

    static async onExit(code)
    {
        console.log("SIGINT signal.")

        console.log("Closing all recording streams...");
        for (const record in this.voice.records)
        {
            record.voiceStream.destroy();
        }
        console.log("Leaving all voice channels...");
        for (const [name, voice] of this.client.voice.connections)
        {
            await voice.channel.leave();
        }
        await this.client.user?.setStatus("invisible");
        process.exit(code);
    }
}

Program.Main();
