import dotenv from 'dotenv';
dotenv.config();
import Discord from 'discord.js'
const discordClient = new Discord.Client();
import Twitter from 'twitter';
import fs from 'fs';
import chalk from 'chalk';

let lastTweet = undefined;

const twitterClient = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

const isPatchNote = (lastTweet) => lastTweet.full_text.toLowerCase().includes('preview') && lastTweet.full_text.toLowerCase().includes('11.')


const initLastTweet = (tweets) => {
    let data = undefined;
    try {
        data = fs.readFileSync('./lastTweet.json', 'utf8');
    } catch(e) {
        console.log(e.message);
    }
    if (data === "")
        lastTweet = tweets[0];
    else
        lastTweet = JSON.parse(data);
}

const formatTextForDiscord = (full_text) => {
    full_text = full_text.replace(/https:\/\/.*/g, '');
    return full_text;
}

const getAllImages = (lastTweet) => {
    let images = [];

    for (let elem of lastTweet.extended_entities.media)
        images.push(elem.media_url_https);
    return images;
}

const setTitleBold = (lastTweet) => {
    let text = lastTweet.full_text;

    try {
        text = text.split('\n');
        if (text && text.length !== 0) {
            text[0] = '**' + text[0] + '**';
        }
        text = text.join('\n');
    } catch(e) {
        console.log('an error occured spliting text');
    }
    return text;
}

const getLastTweets = async(LOLPatchsChannel) => {
    let username = 'MarkYetter';
    let params = {
        screen_name: username,
        tweet_mode: 'extended'
    };
    twitterClient.get('statuses/user_timeline', params, async function(error, tweets, response) {
        if (!error) {
            if (!lastTweet) {
                initLastTweet(tweets);
            }
            if (lastTweet.id !== tweets[0].id) {
                console.log('New tweet detected !\n');
                console.log(tweets[0]);
                lastTweet = tweets[0];
                console.log(lastTweet.full_text);
                if (isPatchNote(lastTweet)) {
                    console.log(chalk.green(`\nIt's a patch preview !`), '\n-----------------------');
                    lastTweet.full_text = formatTextForDiscord(lastTweet.full_text);
                    lastTweet.full_text = setTitleBold(lastTweet);
                    let images = getAllImages(lastTweet);
                    let LOLRole = "840816813238386698";
                    await LOLPatchsChannel.send( '-------------------------------------------------------------------\n' + `<@&${LOLRole}>\n` + lastTweet.full_text + '\n\n' + images.join('\n'));
                }
                else
                    console.log(chalk.red(`\nIt's not a patch preview`))
                fs.writeFileSync('./lastTweet.json', JSON.stringify(lastTweet));
                return 0;
            }
            else {
                console.log(`${chalk.red('Last Tweet unchanged')}`);
                return 0;
            }
        }
        else {
            console.log(error.message);
            return -1;
        }
    });
}

const loginClient = async() => await discordClient.login(process.env.DISCORD_BOT_TOKEN);

const main = async() => {
    discordClient.on('ready', async() => {
        console.log('Discord bot is online');
        const LOLPatchsChannel = await discordClient.channels.cache.get("799497643344396299"); //#la-grosse-league
        setInterval(() => {getLastTweets(LOLPatchsChannel)}, 10000);
    })
}

main();
loginClient();