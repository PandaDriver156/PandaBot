import { AccessLevels, Message, BaseCommand } from "../types";
import { getPresenceData } from "../utility";

export default class TrackCommand implements BaseCommand
{
    async execute(message: Message, args: string[])
    {
        const user = message.client.users.cache.get(message.mentions.members.first()?.id) ||
            message.client.users.cache.get(args[0]) ||
            message.client.users.cache.find(u => u.tag === args[0]);

        const channel = message.mentions.channels.first() || message.client.channels.cache.get(args[1]);

        if (!user)
        {
            message.channel.send(":x: User not found");
            return;
        }

        if (!channel)
        {
            message.channel.send(":x: Please specifiy channel where presence updates should be logged");
            return;
        }

        // const exists = message.client.db.prepare("SELECT * from tracked_users WHERE traced_user_id = ?").get(user.id);
        const exists = message.client.tracked_users.some(u => u.user_id === user.id);

        if (exists)
        {
            message.channel.send(":x: This user is already tracked");
            return;
        }

        message.client.db.prepare("INSERT INTO tracked_users (channel, tracked_user) VALUES (?, ?)").run(channel.id, user.id);

        message.client.tracked_users.push({
            user_id: user.id,
            channel_id: channel.id,
            last_presence: getPresenceData(user.presence)
        });

        message.channel.send(`:white_check_mark: \`${user.tag}\`'s presence changes are now saved`);
    }

    info = {
        level: AccessLevels.BotAdmin
    }
}
