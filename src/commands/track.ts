import { GuildChannel, MessageEmbed } from "discord.js";
import { AccessLevels, BaseCommand, Colors, Message } from "../types";
import { getPresenceData } from "../utility";

const command: BaseCommand = {
    async execute(message, args)
    {
        switch (args[0])
        {
            case "add":
                addUser(message, args.slice(1));
                break;
            case "remove":
                removeUser(message, args.slice(1));
                break;
            case "list":
                const trackedUsers = message.client.tracked_users
                    .filter(u => u.guild === message.guild.id)
                    .map(u =>
                    {
                        const user = message.client.users.cache.get(u.user);
                        return `${user.tag} (${user.toString()})`;
                    });

                if (!trackedUsers.length)
                {
                    const embed = new MessageEmbed()
                        .setColor(message.guild.me.displayColor || Colors.lightBlue)
                        .setDescription("No users are tracked on this server");

                    message.channel.send(embed);
                    return;
                }

                const embed = new MessageEmbed()
                    .setTitle("Tracked Users")
                    .setColor(message.guild.me.displayColor || Colors.lightBlue)
                    .setDescription(trackedUsers.join("\n"))
                    .setTimestamp();

                message.channel.send(embed);
                break;
            default:
                message.channel.send(":x: Invalid subcommand provided. Valid ones are: add, remove, list")
                break;
        }
    },
    info: {
        level: AccessLevels.BotAdmin
    }
};

const addUser = (message: Message, args: string[]) =>
{
    const user = message.client.users.cache.get(message.mentions.members.first()?.id) ||
        message.client.users.cache.get(args[0]) ||
        message.client.users.cache.find(u => u.tag === args[0]);

    const channel = (message.mentions.channels.first() || message.client.channels.cache.get(args[1])) as GuildChannel;

    if (!user)
    {
        message.channel.send(":x: User not found");
        return false;
    }

    if (!channel)
    {
        message.channel.send(":x: Please specifiy channel where presence updates should be logged");
        return false;
    }

    if (user.id === message.client.user.id)
    {
        message.channel.send("Don't worry i'll never be fake-offline :wink:");
        return false;
    }

    // const exists = message.client.db.prepare("SELECT * from tracked_users WHERE traced_user_id = ?").get(user.id);
    const exists = message.client.tracked_users.some(u => u.guild === message.guild.id && u.user === user.id);

    if (exists)
    {
        message.channel.send(":x: This user is already tracked");
        return false;
    }

    message.client.db.prepare("INSERT INTO tracked_users (guild, channel, tracked_user) VALUES (?, ?, ?)").run(channel.guild.id, channel.id, user.id);

    message.client.tracked_users.push({
        guild: channel.guild.id,
        user: user.id,
        channel: channel.id,
        last_presence: getPresenceData(user.presence),
        last_fake_offline_at: null
    });

    message.channel.send(`:white_check_mark: \`${user.tag}\`'s presence changes are now saved`);
    return true;
};

const removeUser = (message: Message, args: string[]) =>
{
    const user = message.client.users.cache.get(message.mentions.members.first()?.id) ||
        message.client.users.cache.get(args[0]) ||
        message.client.users.cache.find(u => u.tag === args[0]);

    const trackInfoIndex = message.client.tracked_users.findIndex(t => t.guild === message.guild.id && t.user === user.id);
    const trackInfo = message.client.tracked_users[trackInfoIndex];

    if (!user || !trackInfo)
    {
        const embed = new MessageEmbed()
            .setColor(Colors.red)
            .setDescription("User not found or is not tracked");
        message.channel.send(embed);
        return;
    }

    message.client.db.prepare("DELETE FROM tracked_users WHERE guild = ? AND tracked_user = ?").run(trackInfo.guild, trackInfo.user);
    message.client.tracked_users.splice(trackInfoIndex, 1);

    const embed = new MessageEmbed()
        .setColor(Colors.green)
        .setDescription(`${user.tag} is no longer tracked`);
    message.channel.send(embed);
};

export default command;
