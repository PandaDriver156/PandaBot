import * as BetterSqlite3 from "better-sqlite3";
import * as Discord from "discord.js";
import * as path from "path";
import { Commander } from "./commander";
import { Colors, Config, UserTrack } from "./types";
import { VoiceManager } from "./voice";
import { getPresenceData } from "./utility"

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
            allowBots: false
        });
        if (this.config.track_voice)
            this.voiceManager = new VoiceManager(this);

        this.db.prepare("CREATE TABLE IF NOT EXISTS tracked_users (channel TEXT, tracked_user TEXT PRIMARY KEY)").run();
        this.db.prepare("CREATE TABLE IF NOT EXISTS user_presences (id TEXT, date TEXT, data TEXT)").run();
        this.tracked_users = this.db.prepare("SELECT channel, tracked_user FROM tracked_users").all().map(result =>
        {
            return {
                user_id: result.tracked_user,
                channel_id: result.channel,
                last_presence: null
            };
        });

        this.on("ready", this.onReady);
        this.on("presenceUpdate", this.onPresenceUpdate);
        this.on("typingStart", this.onTypingStart);
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
        this.updatePresence(true);

        setInterval(this.checkPresences.bind(this), this.config.presence_check_interval);
    }

    onTypingStart(channel: Discord.Channel, user: Discord.User)
    {
        const trackInfo = this.tracked_users.find(u => u.user_id === user.id);
        if (!trackInfo) return;
        if (user.presence.status !== "online" && user.presence.status !== "dnd") this.logFakeOffline(trackInfo.channel_id, trackInfo.user_id, "typing in a channel");
    }

    logFakeOffline(channelResolv: Discord.ChannelResolvable, userResolv: Discord.UserResolvable, action: string)
    {
        const channel = this.channels.resolve(channelResolv) as Discord.TextChannel;
        const user = this.users.resolve(userResolv);
        const embed = new Discord.MessageEmbed()
            .setColor(Colors.red)
            .setTitle(":warning: Bad boi detected")
            .setThumbnail(user.avatarURL())
            .setDescription(`User: ${user.tag} \nAction: ${action} \nStatus: ${this.config.emojis[user.presence.status as "offline" | "online" | "idle"]} ${user.presence.status}`)
            .setTimestamp();
            channel.send(embed);
    }

    checkPresences(users = this.tracked_users)
    {
        for (const userTrack of users)
        {
            const user = this.users.cache.get(userTrack.user_id);
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

