// config env variables
const dotenv = require('dotenv');
dotenv.config();

// Telegram bot libraries
const Telegraf = require("telegraf");
const session = require('telegraf/session')
const Stage = require('telegraf/stage');
const Scene = require('telegraf/scenes/base');
const bot = new Telegraf(process.env.BOT_TOKEN);

// working with zip files
var archiver = require('archiver');

// requesting
const bent = require('bent');


/*-------- Globals -------*/

// const source2 = createReadStream('zip.zip');
// const destination = createWriteStream('./test.zip');

// Handler factoriess
const { enter, leave } = Stage;

// get request as stream
const getStream = bent();

const validFileTypes = ['photo', 'video', 'audio', 'animation', 'document', 'sticker'];

// loading gif url
const loadingAnimationURL =
  "https://media.giphy.com/media/ya4eevXU490Iw/giphy.gif";


/*-------- Main -------*/


// gettingFiles scene
let archive;
const gettingFilesScene = new Scene('gettingFiles')
gettingFilesScene.enter((ctx) => {
  // ziping streams
  archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  });
  archive.on('error', function(err) {
    throw err;
  });
  ctx.session.counter = ctx.session.counter || 0;
  ctx.replyWithMarkdown('Send/Forward me your files, when done, use `/done` command to get the zip file.')
})
gettingFilesScene.leave((ctx) => ctx.reply('zipping'))
gettingFilesScene.command('done', (ctx) => {
  console.log('done is called --------')
  archive.finalize();
  ctx.replyWithDocument({ source: archive, filename: "zipped.zip" })
  leave();
});
gettingFilesScene.on('message', async (ctx) => {
  let count = ctx.session.counter++
  // get the file type
  let fileType = ctx.updateSubTypes[0];
  console.log(fileType)
  fileType = fileType === 'animation' ? 'document' : fileType;
  if (!(validFileTypes.includes(fileType))) {
    return ctx.reply(`please send a valid file of these types: ${validFileTypes}`);
  }
  let document = ctx.message[fileType];
  if (fileType === 'photo') document = document.slice(-1)[0]
  let fileID = document.file_id;
  let fileName = document.file_name || count || document.file_unique_id;
  // get the url, download the file, add file to target zip
  let url = await bot.telegram.getFileLink(fileID);
  let source = await getStream(url);
  await archive.append(source, { name: `${fileName}.jpg` });
  ctx.reply('done');
});

// zipping scene
// const zippingScene = new Scene('zipping')
// zippingScene.enter((ctx) => ctx.replyWithAnimation({source: loadingAnimationURL}))
// zippingScene.leave((ctx) => ctx.reply('Bye'))
// zippingScene.hears('hi', enter('greeter'))
// zippingScene.on('message', (ctx) => ctx.replyWithMarkdown('Send `hi`'))

const stage = new Stage([gettingFilesScene], { ttl: 60 })
bot.use(session())
bot.use(stage.middleware());


// on every message
// bot.use((ctx, next) => {
//   // console.log(ctx.message, "\n");
//   // console.log(ctx.updateSubTypes, "\n");

//   return next();
// });

bot.catch((err, ctx) => {
  console.log(`Ooops, encountered an error for ${ctx.updateType}`, err)
})

// bot.hears("zip", ctx =>
// ctx.replyWithDocument({ source, filename: "zipf.zip" })
// );

bot.start(ctx =>
  ctx.reply(
    "Hey, I zip your files. use /zip command to start or /gift for a gift.zip!"
  )
);

bot.help(ctx =>
  ctx.reply(
    "use /zip command and send your files or album, then use done button on keyboard to zip them"
  )
);

bot.command('zip', (ctx) => ctx.scene.enter('gettingFiles'));

// bot.on('message', () => {});

bot.launch();
