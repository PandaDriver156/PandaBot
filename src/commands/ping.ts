import { AccessLevels, BaseCommand } from "../types";

const command: BaseCommand = {
    async execute(message)
    {
        const msg = await message.channel.send(":table_tennis: Pong!");

        const respTime = msg.createdTimestamp - message.createdTimestamp;

        msg.edit(`:table_tennis: Pong! Response time: ${Math.round(respTime)}ms, API latency: ${Math.round(message.client.ws.ping)}ms`);
    },
    info: {
        level: AccessLevels.User
    }
};

export default command;
