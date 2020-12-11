const Discord = require('discord.js');
const fetch = require('node-fetch');

/**
 * @typedef {object} ChannelData
 * @property {Discord.Snowflake} id
 * @property {string} type
 * @property {string} name
 */

/**
 * @typedef {object} RoleData
 * @property {Discord.Snowflake} id
 * @property {string} name
 * @property {number} color
 * @property {boolean} hoist
 * @property {number} position
 * @property {Discord.Permissions[]} permissions
 * @property {boolean} mentionable
 */

/**
 * @param {Discord.Guild} guild 
 */
exports.getGuildData = async (guild) =>
{
    const data = {
        id: guild.id,
        name: guild.name,
        icon: await this.getBase64ImageFromUrl(guild.iconURL()),
        owner: guild.ownerID,
        region: guild.region,
        channels: guild.channels.cache.map(channel => this.getChannelData(channel)),
        roles: guild.roles.cache.map(role => this.getRoleData(role)).sort((a, b) => a.position < b.position ? 1 : -1)
    };
    return data;
};

/**
 * @param {Discord.CategoryChannel|Discord.TextChannel|Discord.VoiceChannel} channel
 * @returns {ChannelData}
 */
exports.getChannelData = (channel) =>
{
    const data = {
        id: channel.id,
        type: channel.type,
        name: channel.name,
        position: channel.position
    };

    switch (channel.type)
    {
        case "text":
            data.parent = channel.parentID;
            data.topic = channel.topic;
            data.nsfw = channel.nsfw;
            data.rateLimitPerUser = channel.rateLimitPerUser;
            break;
        case "voice":
            data.parent = channel.parentID;
            data.bitrate = channel.bitrate;
            data.userLimit = channel.userLimit;
            break;
    }

    return data;
};

/**
 * @param {Discord.Role} role
 * @returns {RoleData}
 */
exports.getRoleData = (role) =>
{
    return {
        id: role.id,
        name: role.name,
        position: role.position,
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        permissions: role.permissions
    };
};

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
exports.getBase64ImageFromUrl = (url) =>
{
    if (!url) return null;
    return new Promise(res =>
    {
        fetch(url).then(resp => resp.buffer()).then(buffer => res(buffer.toString('base64')));
    });
}
