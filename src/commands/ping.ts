import { AccessLevels, BaseCommand, Message } from "../types";

export default class PingCommand implements BaseCommand
{
    async execute(message: Message)
    {
        const msg = await message.channel.send(":table_tennis: Pong!");

        msg.edit(`:table_tennis: Pong! Response time: ${Math.round(msg.createdTimestamp - message.createdTimestamp)}ms, API latency: ${Math.round(message.client.ws.ping)}ms`);
    }

    info = {
        level: AccessLevels.User
    }
}