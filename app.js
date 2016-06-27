/* dependencies*/
var restify = require('restify');
var builder = require('botbuilder');
var movieDatabase = require('./movieDatabase.js');
var freeModeDialog = require('./freeModeDialog.js');
var guidedModeDialog = require('./guidedModeDialog.js');

/* creates a Luis Dialog*/
var model = 'https://api.projectoxford.ai/luis/v1/application?id=85c6e28d-607b-4a71-87e6-c694f038eb6e&subscription-key=a0163ecd7c864fd290eef12ce9269e70';
var rootDialog = new builder.LuisDialog(model);

/* CONFIG VARIABLES (GLOBAL)*/
CONFIG = {
    THRESHOLD: 0.4,
    NUMBER_OF_RETURN: 3,
    RESPONSE_IMAGE_SIZE: "w300"

}
/* available modes */
var MODE = {
    ROOT: "/",
    FREE: "/freeMode",
    GUIDED: "/guidedMode"
}

/* LUIS adjustments*/
rootDialog.setThreshold(CONFIG.THRESHOLD); // the default value is 0.1! - this is too damn low!


/* creates the movieBot */
// Create movieBot with options and add dialogs
var movieBot = new builder.BotConnectorBot({
    appId: 'MovieBot',
    appSecret: 'MovieBotSecret'
});

// adds all the dialogs
movieBot.add(MODE.ROOT, rootDialog);
movieBot.add(MODE.FREE, new freeModeDialog(builder, movieDatabase));
movieBot.add(MODE.GUIDED, new guidedModeDialog(builder, movieDatabase));

/* creates the dialogs */
/* on default rootDialog*/
rootDialog.onDefault(builder.DialogAction.send("I am sorry. I don´t know what do you mean. Please choose a mode."));
/* on begin rootDialog*/
rootDialog.onBegin(function (session, args, next) {
    session.send('Hi! I am the awesome MovieBot. \n\nNice to meet you.\n\n' + 'I want to help you to find the perfect movie or series.' +
        ' I offer two ways of help. The **guided mode** (currently not implemented) and the **free mode** (beta).\n\n' + 'Which mode do you want to use? :)');
});

/* this is the help rootDialog*/
rootDialog.on('userNeedsHelp', function (session, args, next) {
    session.send('This is the help rootDialog for the default mode');
});
/* mode dialogs */
rootDialog.on('userChoosesGuidedMode', function (session, args, next) {
    /* starts the guided mode dialog*/
    session.beginDialog(MODE.GUIDED);
});
rootDialog.on('userChoosesFreeMode', function (session, args, next) {
    /* starts the free mode dialog*/
    session.beginDialog(MODE.FREE);
});

/* have to be shifted to the mode dialogs */
rootDialog.on('considerGenreActor', function (session, args, next) {
    session.send('Consider Genre and Actor');
});

// Setup Restify Server
var server = restify.createServer();
server.post('/api/messages', movieBot.verifyBotFramework(), movieBot.listen());
server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});