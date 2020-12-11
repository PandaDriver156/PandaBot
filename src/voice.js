const fs = require('fs');
const dayjs = require('dayjs');
const Discord = require('discord.js');

class VoiceHandler
{
    /**
     * @param {Discord.Client} client
     */
    constructor(client)
    {
        this.records = new Map();
        this.client = client;
        this.client.on('voiceStateUpdate', this.voiceStateChangeHandler.bind(this));
        this.client.on('guildMemberSpeaking', this.onMemberSpeaking.bind(this));
        this.client.on('ready', this.onReady.bind(this));
    }

    /**
     * @param {Discord.Snowflake} channelID
     * @returns {Promise<Discord.VoiceConnection>}
     */
    joinChannel(channelID)
    {
        return new Promise((res, rej) =>
        {
            /**
             * @type {Discord.VoiceChannel}
             */
            const channel = this.client.channels.cache.get(channelID);
            channel.join().then(connection =>
            {
                // Play a very short sound to make sure connection is setup, then mute
                connection.play(fs.createReadStream('res/silence.mp3'));
                channel.guild.me.voice.setSelfMute(true);
                res(connection);
            }).catch(e => rej(e));
        });
    }

    /**
     * @param {Discord.VoiceState} oldState
     * @param {Discord.VoiceState} newState
     */
    async voiceStateChangeHandler(oldState, newState)
    {
        const member = newState.member;
        const self = newState.guild.me;
        if (newState.channelID)
        {
            if (newState.channelID !== oldState.channelID)
            {
                const oldKey = `${oldState.channelID}-${member.id}`;
                if (this.records.has(oldKey))
                {
                    console.log("has key");
                    const oldRecord = this.records.get(oldKey);
                    oldRecord.voiceStream.destroy();
                    this.records.delete(oldKey);
                }

                if (newState.channelID === self.voice.channelID)
                {
                    this.setupUserStream(member);
                }
            }

            if (member.id === this.client.mainUser.id)
            {
                await this.joinChannel(newState.channelID);

                if (member.voice.speaking)
                    this.setupUserStream(member.id, member);
            }
        }

        if (newState.member.id === this.client.mainUser.id && !newState.channel)
        {
            await self.voice.channel?.leave();
        }
    }

    /**
     * @param {Discord.GuildMember} spokenUser 
     */
    setupUserStream(spokenUser)
    {
        if (spokenUser.id === this.client.user.id) return;
        if (spokenUser.user.bot) return;
        const self = spokenUser.guild.me;

        if (!fs.existsSync('records'))
            fs.mkdirSync('records');

        const voiceStream = self.voice.connection.receiver.createStream(spokenUser.id, { mode: 'pcm', end: 'manual' });
        const writeStream = fs.createWriteStream(`records/${dayjs().format(`YYYY-MM-DD_HH-mm`)}_${spokenUser.id}.pcm`);
        this.records.set(`${self.voice.channelID}-${spokenUser.id}`, {
            voiceStream,
            writeStream
        });
        let chunkReceived = false;
        voiceStream.on('data', chunk =>
        {
            if (!chunkReceived)
            {
                console.log(`chunk - ${spokenUser.user.tag}`);
                chunkReceived = true;
            }
            writeStream.write(chunk);
        });
        voiceStream.on('end', () =>
        {
            console.log("End");
            writeStream.end();
            this.records.delete(`${self.voice.channelID}-${spokenUser.id}`);
        });

    }

    /**
     * @param {Discord.GuildMember} member
     */
    onMemberSpeaking(member)
    {
        if (!this.records.has(`${member.voice.channelID}-${member.id}`))
            this.setupUserStream(member);
    }

    async onReady()
    {
        guildLoop:
        for (const g of this.client.guilds.cache.map(g => g))
        {
            for (const u of g.members.cache.map(m => m))
            {
                if (this.client.mainUser.id === u.id && u.voice.channel)
                {
                    await this.joinChannel(u.voice.channelID);
                    break;
                }
            };
            g.members.cache.forEach(m =>
            {
                if (m.voice.channelID === g.me.voice.channelID)
                {
                    if (m.voice.speaking)
                        this.setupUserStream(m);
                }
            });
        };
    }
}

module.exports = VoiceHandler;