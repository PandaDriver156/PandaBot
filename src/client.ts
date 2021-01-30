import * as BetterSqlite3 from "better-sqlite3";
import * as Discord from "discord.js";
import * as path from "path";
import { Commander } from "./commander";
import { Colors, Config, FakeOfflineInfo, Message, UserTrack } from "./types";
import { VoiceManager } from "./voice";
import { getPresenceData, wait } from "./utility"

export interface ClientOptions extends Discord.ClientOptions
{
    config: Config
}

export class Client extends Discord.Client
{
    public config: Config;
    public commander: Commander;
    public voiceManager: VoiceManager;
    public mainUser: Discord.User;
    public db: BetterSqlite3.Database;
    public tracked_users: UserTrack[];

    constructor(options: ClientOptions)
    {
        super(options);
        this.config = options.config;
        this.db = new BetterSqlite3("./data.db");
        this.commander = new Commander({
            client: this,
            prefix: this.config.prefix,
            path: path.join(__dirname, 'commands'),
            allowBots: false,
            autoHandleMessages: false
        });
        if (this.config.track_voice)
            this.voiceManager = new VoiceManager(this);

        this.db.prepare("CREATE TABLE IF NOT EXISTS tracked_users (guild TEXT, channel TEXT, tracked_user TEXT)").run();
        this.db.prepare("CREATE TABLE IF NOT EXISTS user_presences (id TEXT, date TEXT, data TEXT)").run();
        this.tracked_users = this.db.prepare("SELECT * FROM tracked_users").all().map(result =>
        {
            return {
                guild: result.guild,
                user: result.tracked_user,
                channel: result.channel,
                last_presence: null,
                last_fake_offline_at: null
            };
        });

        this.on("message", this.onMessage)
        this.on("ready", this.onReady);
        if (!this.config.presence)
            this.on("presenceUpdate", this.onPresenceUpdate);
        this.on("typingStart", this.onTypingStart);
        this.on("voiceStateUpdate", this.onVoiceStateChange)
    }

    async onMessage(message: Message)
    {
        this.commander.handleMessage(message);

        if (message.author.bot) return;

        const trackInfos = this.tracked_users.filter(u => u.user === message.author.id)
        if (!trackInfos.length) return;
        if (!["online", "dnd"].includes(message.author.presence.status))
        {
            for (const trackInfo of trackInfos)
            {
                await this.logFakeOffline({
                    channel: trackInfo.channel,
                    user: message.author,
                    action: ":inbox_tray: Sent a message",
                    extraInfo: [
                        `Server: ${message.guild.name}`,
                        `Channel: ${message.channel}`
                    ]
                });
                await wait(500);
            }
        }
    }

    onPresenceUpdate(oldPresence: Discord.Presence, newPresence: Discord.Presence)
    {
        if (newPresence.userID === this.mainUser.id)
            this.updatePresence(false);
    }

    async onReady()
    {
        console.log("Ready!");

        this.mainUser = this.users.cache.get(this.config.permLevels.BotOwner) || await this.users.fetch(this.config.permLevels.BotOwner);

        if (this.config.presence)
            this.user.setPresence({
                status: this.config.presence
            });
        else this.updatePresence(true);

        setInterval(this.checkPresences.bind(this), this.config.presence_check_interval);
    }

    async onTypingStart(channel: Discord.GuildChannel, user: Discord.User)
    {
        if (user.bot) return;
        const trackInfos = this.tracked_users.filter(u => u.user === user.id);
        if (!trackInfos.length) return;
        if (user.presence.status !== "online" && user.presence.status !== "dnd")
            for (const trackInfo of trackInfos)
            {
                await this.logFakeOffline({
                    channel: trackInfo.channel,
                    user: user,
                    action: ":keyboard: Started typing in a channel",
                    extraInfo: [
                        `Server: ${channel.guild.name}`,
                        `Channel: ${channel.name} (${channel})`
                    ]
                });
                await wait(500);
            }

    }

    async onVoiceStateChange(oldState: Discord.VoiceState, newState: Discord.VoiceState)
    {
        if (newState.member.user.bot) return;
        const trackInfos = this.tracked_users.filter(u => u.user === newState.member.id);
        if (!trackInfos.length) return;
        if (!["online", "dnd"].includes(newState.member.user.presence.status))
        {
            if (newState.channelID && oldState.channelID !== newState.channelID)
                for (const trackInfo of trackInfos)
                {
                    await this.logFakeOffline({
                        channel: trackInfo.channel,
                        user: newState.member.user,
                        action: ":speaker: Joined a voice channel",
                        extraInfo: [
                            `Server: ${newState.guild.name}`,
                            `Channel: ${newState.channel.name}`
                        ]
                    });
                    await wait(500);
                }

            else if (!oldState.streaming && newState.streaming)
            {
                for (const trackInfo of trackInfos)
                {
                    await this.logFakeOffline({
                        channel: trackInfo.channel,
                        user: newState.member,
                        action: ":desktop: Started streaming in a voice channel",
                        extraInfo: [
                            `Server: ${newState.guild.name}`,
                            `Channel: ${newState.channel.name}`
                        ]
                    });
                    await wait(500);
                }
            }
        }
    }

    logFakeOffline(info: FakeOfflineInfo)
    {
        const channel = this.channels.resolve(info.channel) as Discord.TextChannel;
        const user = this.users.resolve(info.user);
        const trackInfo = this.tracked_users.find(u => u.user === user.id && u.channel === info.channel);
        if ((Date.now() - trackInfo.last_fake_offline_at?.getTime()) < 300000) return;
        const lines = [
            `User: ${user.tag}`,
            `Action: ${info.action}`,
            `Status: ${this.config.emojis[user.presence.status as "offline" | "online" | "idle"]} ${user.presence.status}`
        ];
        if (info.extraInfo) lines.push(...info.extraInfo);
        trackInfo.last_fake_offline_at = new Date();
        const embed = new Discord.MessageEmbed()
            .setColor(Colors.red)
            .setTitle(":warning: Bad boi detected")
            .setThumbnail(user.avatarURL({ format: "png", size: 256 }))
            .setDescription(lines.join("\n"))
            .setTimestamp();
        return channel.send(embed);
    }

    checkPresences(users = this.tracked_users)
    {
        for (const userTrack of users)
        {
            const user = this.users.cache.get(userTrack.user);
            const presenceData = getPresenceData(user.presence);
            if (userTrack.last_presence?.status !== presenceData.status ||
                JSON.stringify(userTrack.last_presence?.devices) !== JSON.stringify(presenceData.devices))
            {
                this.savePresence(user);
                userTrack.last_presence = presenceData;
            }
        }
    }

    async updatePresence(isFirst = false)
    {
        const userStatus = this.mainUser.presence.status;
        if (userStatus === this.user.presence.status && !isFirst) return;
        await this.user.setStatus(userStatus === 'offline' ? 'invisible' : userStatus);
    }

    savePresence(user: Discord.User)
    {
        const date = new Date();
        const presence = getPresenceData(user.presence);
        this.db.prepare("INSERT INTO user_presences (id, date, data) VALUES (?, ?, ?)").run(user.id, date.toISOString(), JSON.stringify(presence));
    }
}

