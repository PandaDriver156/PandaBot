import { WriteStream } from "fs";
import { Readable } from "stream";

import * as Discord from "discord.js";
import { Client } from "./client"

export const AccessLevels = {
    User: 1,
    Moderator: 2,
    Administrator: 3,
    ServerOwner: 4,
    BotModerator: 8,
    BotAdmin: 9,
    BotOwner: 10
};

export interface VoiceRecord
{
    voiceStream: Readable,
    writeStream: WriteStream
}

export interface PresenceData
{
    status: Discord.PresenceStatus,
    activities: Discord.Activity[],
    devices: Discord.ClientPresenceStatusData
}

export interface UserTrack
{
    user_id: Discord.Snowflake,
    channel_id: Discord.Snowflake,
    last_presence: PresenceData
}

export const Colors = {
    lightBlue: 65524,
    red: 15544872
}

export class BaseCommand
{
    execute: (message: Message, args: string[]) => void;
    info: {
        name?: string,
        aliases?: string[],
        level: typeof AccessLevels[keyof typeof AccessLevels]
    }
}

export interface Config
{
    prefix: string;
    token: string
    track_voice: boolean,
    presence_check_interval: number,
    allowNotSpecifiedUsers: boolean,
    permLevels: {
        [key in Exclude<keyof typeof AccessLevels, "BotOwner">]: Discord.Snowflake[];
    } & {
        BotOwner: Discord.Snowflake;
    },
    emojis: {
        online: string,
        offline: string,
        idle: string,
        dnd: string
    }
}

export class GuildMember extends Discord.GuildMember
{
    public client: Client
}

export class Message extends Discord.Message
{
    public client: Client;
    public member: GuildMember
}
