/**
 * Created by Fabian on 25.05.2016.
 */

module.exports = function FreeModeDialog(builder, movieDatabase) {

    var model = 'https://api.projectoxford.ai/luis/v1/application?id=85c6e28d-607b-4a71-87e6-c694f038eb6e&subscription-key=a0163ecd7c864fd290eef12ce9269e70';

    var printMode = {
        MOVIE: 0,
        SERIES: 1,
        ACTOR: 2
    };


    var dialogFreeMode = new builder.LuisDialog(model);

    dialogFreeMode.setThreshold(CONFIG.THRESHOLD); // the default value is 0.1! - this is too damn low!

    dialogFreeMode.onBegin(function (session, args, next) {
        session.send("You choose the free mode.");
        session.send("You can tell me statements about movies like \" show me an action movie with Will Smith\" and I will show you action movies with Will Smith."); // should ne imporved
        session.send("I will return the " + CONFIG.NUMBER_OF_RETURN + " best movies that I find.");
    });

    dialogFreeMode.on('userNeedsHelp', function (session, args, next) {
        session.send('This is the free mode help');
    });

    dialogFreeMode.on('considerActor', [
        function (session, args, next) {
            searchForActor(session, args, builder);
        }
    ]);

    dialogFreeMode.on('bestMoviesInYear', [
        function (session, args, next) {

            movieDatabase.bestMoviesInYear(builder, function (response) {
                if (response.length > 0) { //Output result
                    if (videoType.entity == 'movies' || videoType.entity == 'movie') {
                        printResults(session, response, printMode.MOVIE);
                    }
                    else if (videoType.entity == 'series' || videoType.entity == 'serie') {
                        printResults(session, response, printMode.SERIES);
                    }
                    else {
                        printResults(session, response, printMode.MOVIE);
                    }
                }
                else
                    session.send("Sorry :-(. We haven't found anything for you.");
            });
        },
        function (session, results) {
            session.send("Do you have any other questions?");
        }
    ]);

    dialogFreeMode.on('showCurrentCinemaMovies', function (session, args, next) {
        session.send('Loading the current movies in cinema. Please wait a second.');
        movieDatabase.moviesInTheatre(function (response) {
            session.send('Here is your result:');
            printResults(session, response, printMode.MOVIE);
        });
    });

    //Call the MovieDB and search for the 3 best movies of the actor
    function searchForActor(session, args, builder) {
        console.log('SearchForActor');
        movieDatabase.searchActor(builder, args, function (response) {
            if (response.length > 0) { //Output result
                printResults(session, response, printMode.MOVIE);
            }
            else
                session.send("Sorry :-(. We haven't found anything");
        });
    }

    /* Looks for similar movies or series
     * */
    var promptData = {
        "movie" : {
            "videoType" : "movie",
            "videoName" : null
        },
        "series" : {
            "videoType" : "series",
            "videoName" :null
        }
    }

    dialogFreeMode.on('similarMoviesOrSeries', [
        function (session, args, next) {

            var videoName = builder.EntityRecognizer.findEntity(args.entities, 'MovieOrSeries');
            var videoType = builder.EntityRecognizer.findEntity(args.entities, 'VideoType');

            if (videoType == null) {
                promptData.movie.videoName = videoName.entity;
                promptData.series.videoName = videoName.entity;
                builder.Prompts.choice(session, "Is this a movie or a series?\n", promptData);
            } else {
                next({
                    response: {
                        "videoType": videoType.entity,
                        "videoName": videoName.entity
                    }
                });
            }
        },
        function (session, result) {

            if (result.response.entity) {
                var video = promptData[result.response.entity];
            }else{
                var video = result.response;
            }
            session.send('Ok. Let me see if I find a '+video.videoType+' that is similar to ' + video.videoName + '');

            /* depends on the video type which query should be performed*/
            if(video.videoType.toLowerCase().match(/^seri/)){
                movieDatabase.searchSimilarSeries(video.videoName, function (response) {
                    responseFunction(response, printMode.SERIES);
                });
            }else{
                movieDatabase.searchSimilarMovie(video.videoName, function (response) {
                    responseFunction(response, printMode.MOVIE);
                });
            }

            /* this funcitons handles the response*/
            function responseFunction(response, printMode){
                if (!response.error) {
                    if (response.length > 0) {
                        movieDatabase.sortMovieOrSeries(response, "popularity", true); // sorts the result desc
                        printResults(session, response, printMode);
                    } else {
                        session.send("I´m sorry. I couldn´t find any similar "+video.videoType+".");
                    }
                } else {
                    session.send("Oh I´m sorry. Something unexpected happend. I couldn´t perform a search.");
                }
            }
            }]);

    function printResults(session, response, mode) {
        session.send(' ');
        if (mode == printMode.MOVIE) {
            session.send("We have found some awesome movies or series for you: ");
            for (var index = 0; index < response.length && index < CONFIG.NUMBER_OF_RETURN; ++index) {
                var counter = index + 1;
                session.send("(" + counter + ") " + response[index].title + ' (Popularity: ' + response[index].popularity + ')');
            }
        }
        else if (mode == printMode.SERIES) {
            session.send("We have found some awesome series for you: ");
            for (var index = 0; index < response.length && index < CONFIG.NUMBER_OF_RETURN; ++index) {
                var counter = index + 1;
                session.send("(" + counter + ") " + response[index].name + ' (Popularity: ' + response[index].popularity + ')');
            }
        }
        else {
            session.send("We have found some awesome stuff for you: ");
            for (var index = 0; index < response.length && index < CONFIG.NUMBER_OF_RETURN; ++index) {
                var counter = index + 1;
                session.send("(" + counter + ") " + response[index].title + ' (Popularity: ' + response[index].popularity + ')');
            }
        }

        session.send("Do you have any other questions?");
    }

    //dialogFreeMode.onDefault(builder.DialogAction.send("Default response free mode"));
    return dialogFreeMode;
}
