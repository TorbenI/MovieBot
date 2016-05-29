/**
 * Created by torbenindorf on 12.05.16.
 */
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
    THRESHOLD : 0.4,
    NUMBER_OF_RETURN : 3
}
/* available modes */
var MODE = {
    ROOT : "/",
    FREE : "/freeMode",
    GUIDED : "/guidedMode"
}

/* LUIS adjustments*/
rootDialog.setThreshold(CONFIG.THRESHOLD); // the default value is 0.1! - this is too damn low!


/* creates the movieBot */
// Create movieBot with options and add dialogs
var movieBot = new builder.BotConnectorBot({
    appId: 'MovieBot',
    appSecret: 'MovieBotSecret'});

// adds all the dialogs
movieBot.add(MODE.ROOT, rootDialog);
movieBot.add(MODE.FREE, new freeModeDialog(builder,movieDatabase));
movieBot.add(MODE.GUIDED, new guidedModeDialog(builder,movieDatabase));

/* creates the dialogs */
/* on default rootDialog*/
rootDialog.onDefault(builder.DialogAction.send("I am sorry. I don´t know what do you mean. Ask for help if you want more information."));
/* on begin rootDialog*/
rootDialog.onBegin(function(session, args, next){
    session.send('Hi! I am the awesome Moviebot. If you want to see a movie but aren´t sure which movie. You should simply aks me. I offer two ways of helping, a guided mode and free mode. Its your choice which mode do you want!');
    session.send('Just tell me which mode you want. The free mode or the guided mode?');
});

/* this is the help rootDialog*/
rootDialog.on('userNeedsHelp', function(session, args, next){
   session.send('This is the help rootDialog for the default mode');
});
/* mode dialogs */
rootDialog.on('userChoosesGuidedMode',function(session, args, next){
    /* starts the guided mode dialog*/
    session.beginDialog(MODE.GUIDED);
});
rootDialog.on('userChoosesFreeMode', function(session, args, next){
    /* starts the free mode dialog*/
    session.beginDialog(MODE.FREE);
});

/* have to be shifted to the mode dialogs */
rootDialog.on('considerGenreActor', function(session, args, next){
    session.send('Consider Genre and Actor');
});

/* have to be shifted to the mode dialogs */

/*
movieBot.add('/yourName', [
    function (session) {
        builder.Prompts.text(session, "Hello... What's your name?");
    },
    function (session, results) {
        session.userData.name = results.response;
        session.replaceDialog('/selectMode');
    }
]);

movieBot.add('/selectMode', [
    function (session) {
        session.send("Hi %s. Nice to meet you.", session.userData.name);
        builder.Prompts.text(session, "Which mode do you want to use?");
    },
    function (session, results) {

        if(results.response == 'Free mode' || results.response == 'Free Mode')
            session.botMode = 'Free'
        else if(results.response == 'Guided mode' || results.response == 'Guide Mode')
            session.botMode = 'Guided'

        session.send("You have choosen the %s Mode", session.botMode);

        if(session.botMode == 'Guided') {
            session.replaceDialog('/guidedMode');
        }
        else if(session.botMode == 'Free') {
            session.replaceDialog('/freeMode');
        }
    }
]);

movieBot.add('/guidedMode', [
    function (session) {
        builder.Prompts.text(session, "How can I help you?");

    },
    function (session, results) {

        session.replaceDialog('/');
    }
]);

movieBot.add('/freeMode', rootDialog, [
]);
*/
/*
movieBot.add('/', [
    function (session) {

    },
    function (session, results) {

        session.replaceDialog('/');
    }
]);
);
*/

// Setup Restify Server
var server = restify.createServer();
server.post('/api/messages', movieBot.verifyBotFramework(), movieBot.listen());
server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});