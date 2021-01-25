import * as BetterSqlite3 from "better-sqlite3";
import * as Discord from "discord.js";
import { Config } from "./types";
import { Client } from "./client";
const Intents = Discord.Intents.FLAGS;
const config: Config = require('../config.json');

class Program
{
    public static client: Client;
    static Main(): void
    {
        console.log("Starting...");
        this.client = new Client({
            config: config,
            ws: {
                intents: [
                    Intents.GUILDS,
                    Intents.GUILD_MEMBERS,
                    Intents.GUILD_MESSAGE_REACTIONS,
                    Intents.GUILD_MESSAGE_TYPING,
                    Intents.GUILD_MESSAGES,
                    Intents.GUILD_PRESENCES,
                    Intents.GUILD_VOICE_STATES
                ]
            },
            presence: {
                status: 'invisible'
            },
            fetchAllMembers: true,
            disableMentions: 'everyone',
            messageCacheMaxSize: 2,
            messageCacheLifetime: 10,
            messageSweepInterval: 60
        });

        process.on('SIGINT', this.onExit.bind(this));
        this.client.login(config.token);
    }

    static async onExit(code: number)
    {
        console.log("SIGINT signal.")

        if (this.client.voiceManager)
        {
            console.log("Closing all recording streams...");
            for (const [name, record] of this.client.voiceManager.records)
            {
                record.voiceStream.destroy();
            }
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
