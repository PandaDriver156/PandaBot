const child_process = require('child_process');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');

const recordsToConvert = process.argv.slice(2).length ? process.argv.slice(2)
    : getAllRecordsToConvert();

convertFiles();

function convertFiles()
{
    if (!recordsToConvert.length)
        return console.log("No records to convert.");

    console.log(`Converting ${recordsToConvert.length} record(s)...`);

    for (const recordName of recordsToConvert)
    {
        const args = `-f s16le -ar 48k -ac 2 -i records/${recordName}.pcm records/${recordName}.wav`;

        child_process.spawnSync(ffmpegPath, args.split(/ +/g));
    }

    console.log("Converting finished.");
}

/**
 * @returns {string[]}
 */
function getAllRecordsToConvert()
{
    const toConvert = [];
    if (!fs.existsSync("records"))
        return [];

    const files = fs.readdirSync("records");
    for (const file of files)
    {
        if (!file.endsWith(".pcm")) continue;
        const fileNameWithoutExtension = file.slice(0, -4);
        if (fs.existsSync(`${fileNameWithoutExtension}.wav`)) continue;
        toConvert.push(fileNameWithoutExtension);
    }
    return toConvert;
}
