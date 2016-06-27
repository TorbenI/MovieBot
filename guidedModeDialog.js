module.exports = function FreeModeDialog(builder, movieDatabase){

    var model = 'https://api.projectoxford.ai/luis/v1/application?id=85c6e28d-607b-4a71-87e6-c694f038eb6e&subscription-key=a0163ecd7c864fd290eef12ce9269e70';

    var guidedModeDialog = new builder.LuisDialog(model);

    guidedModeDialog.setThreshold(CONFIG.THRESHOLD); // the default value is 0.1! - this is too damn low!

    guidedModeDialog.onBegin(function(session, args, next){
        session.send("You choose the guided mode.");
        session.send("Sorry, but this mode is currently not implemented."); // should be improved
    });

    guidedModeDialog.on('userNeedsHelp', function(session, args, next){
        session.send('This is the guided mode help');
    });

    guidedModeDialog.onDefault(builder.DialogAction.send("Default response guided mode"));

    return guidedModeDialog;
}
