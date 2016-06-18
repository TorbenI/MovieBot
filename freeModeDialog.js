/**
 * Created by Fabian on 25.05.2016.
 */

module.exports = function FreeModeDialog(builder, movieDatabase) {

    var model = 'https://api.projectoxford.ai/luis/v1/application?id=85c6e28d-607b-4a71-87e6-c694f038eb6e&subscription-key=a0163ecd7c864fd290eef12ce9269e70';

    var printMode = {
        MOVIE: 0,
        SERIES: 1,
        ACTOR: 2,
        CINEMA: 3
    };

    var dialogFreeMode = new builder.LuisDialog(model);

    dialogFreeMode.setThreshold(CONFIG.THRESHOLD); // the default value is 0.1! - this is too damn low!

    dialogFreeMode.onBegin(function (session, args, next) {

        if (!session.userData.firstRun) {
            // Send the user through the first run experience
            session.userData.firstRun = true;
            session.send("You have chosen the free mode.\n\n" + "In this mode you can ask me different questions for movies and series.\n\n"
                + "You can also ask me for help or examples if you don't know what to do :).\n\n" + "What's your first question?");
            //session.send("I will return the " + CONFIG.NUMBER_OF_RETURN + " best movies that I find.");
        } else {
            session.send("Sorry I couldn't recognize your question.\n\n" + "Do you have another question?");
        }
    });

    dialogFreeMode.on('userNeedsHelp', function (session, args, next) {
        session.send('This is the MovieBot help. You can ask me questions with different parameters. \n\n' +
            'At the moment I am supporting the following questions: \n\n' +
            'Movies or series with actor, genre, year of release\n\n' +
            'Current movies in cinema\n\n' +
            'Similar movies/series like ...\n\n' +
            'Best movies/series of a year\n\n' +
            'You can also ask me for some examples. Have fun :)');
    });

    dialogFreeMode.on('userNeedsExamples', function (session, args, next) {
        session.send('Here are some examples how to use the MovieBot: \n\n' +
            'Show me some movies with Will Smith\n\n' +
            'Show me some action movies with Will Smith\n\n' +
            'Can you tell me an action movie with Bruce Willis from 2003\n\n' +
            'I would like to see the current movies in cinema\n\n' +
            'What are the best series from 2000\n\n' +
            'I like to see some similar movies to Rambo');
    });

    dialogFreeMode.on('considerActor', [
        function (session, args, next) {
            searchForActor(session, args, builder);
        }
    ]);

    dialogFreeMode.on('bestMoviesInYear', [
        function (session, args, next) {

            movieDatabase.bestMoviesInYear(builder, args, function (response) {
                if (response.length > 0) { //Output result

                    var videoType = builder.EntityRecognizer.findEntity(args.entities, 'VideoType');
                    printWithVideoType(session,response, videoType);
                }
                else
                    session.send("Sorry :-(. We haven't found anything for you.\n\nDo you have any other questions?");
            });
        }
    ]);

    dialogFreeMode.on('showCurrentCinemaMovies', function (session, args, next) {
        movieDatabase.moviesInTheatre(function (response) {
            printResults(session, response, printMode.CINEMA);
        });
    });

    //Call the MovieDB and search for the 3 best movies of the actor
    function searchForActor(session, args, builder) {
        movieDatabase.searchActor(builder, args, function (response) {
            if (response.length > 0) { //Output result

                var videoType = builder.EntityRecognizer.findEntity(args.entities, 'VideoType');
                printWithVideoType(session, response, videoType);
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

            /* this functions handles the response*/
            function responseFunction(response, printMode){
                if (!response.error) {
                    if (response.length > 0) {
                        movieDatabase.sortMovieOrSeries(response, "popularity", true); // sorts the result desc
                        printResults(session, response, printMode);
                    } else {
                        session.send("I´m sorry. I couldn´t find any stuff similar to "+video.videoType+".");
                    }
                } else {
                    session.send("Oh I´m sorry. Something unexpected happened. I couldn´t perform a search.");
                }
            }
            }]);

    function printWithVideoType(session, response, videoType) {
        if (videoType.entity == 'movies' || videoType.entity == 'movie' || videoType.entity == 'film' || videoType.entity  == 'films') {
            printResults(session, response, printMode.MOVIE);
        }
        else if (videoType.entity == 'series' || videoType.entity == 'serie') {
            printResults(session, response, printMode.SERIES);
        }
        else
            printResults(session, response, printMode.MOVIE);
    }
    function printResults(session, response, mode) {

        var printString = '';
        if (mode == printMode.MOVIE) {
            printString = 'We have found some awesome movies for you: \n\n';
            for (var index = 0; index < response.length && index < CONFIG.NUMBER_OF_RETURN; ++index) {
                var counter = index + 1;

                var msg = "\n\n**(" + counter + ") " + response[index].title + "**\n" +
                    "\n" +
                    "![](http://image.tmdb.org/t/p/"+CONFIG.RESPONSE_IMAGE_SIZE+"/"+ response[index].poster_path +") \n" +
                    "\n" +
                    "Vote Average: " + response[index].vote_average + "\n" +
                    "\n" +
                    "Vote Count: " + response[index].vote_count + "\n" +
                    "\n" +
                    "Popularity: " + response[index].popularity + "\n" +
                    "\n" +
                    "More info:  https://www.themoviedb.org/movie/"+response[index].id+"";

                printString = printString + msg;
            }
        }
        else if (mode == printMode.SERIES) {
            printString = 'We have found some awesome series for you: \n\n';
            for (var index = 0; index < response.length && index < CONFIG.NUMBER_OF_RETURN; ++index) {
                var counter = index + 1;

                var msg = "\n\n**(" + counter + ") " + response[index].name + "**\n" +
                    "\n" +
                    "![](http://image.tmdb.org/t/p/"+CONFIG.RESPONSE_IMAGE_SIZE+"/"+ response[index].poster_path +") \n" +
                    "\n" +
                    "Vote Average: " + response[index].vote_average + "\n" +
                    "\n" +
                    "Vote Count: " + response[index].vote_count + "\n" +
                    "\n" +
                    "Popularity: " + response[index].popularity + "\n" +
                    "\n" +
                    "More info:  https://www.themoviedb.org/movie/"+response[index].id+"";

                printString = printString + msg;
            }
        }
        else if(mode == printMode.CINEMA) {
            printString = 'Here are the current movies in cinema(last 3 weeks): \n\n';
            for (var index = 0; index < response.length && index < 10; ++index) {
                var counter = index + 1;
                printString = printString + "(" + counter + ") " + response[index].title + ' (Popularity: ' + response[index].popularity + ')\n\n';
            }
        }
        else {
            printString = "We have found some awesome stuff for you:\n\n";
            for (var index = 0; index < response.length && index < CONFIG.NUMBER_OF_RETURN; ++index) {
                var counter = index + 1;
                printString = printString + "(" + counter + ") " + response[index].title + ' (Popularity: ' + response[index].popularity + ')\n\n';
            }
        }

        printString = printString + '\n\nDo you have another question?';
        session.send(printString);
    }

    dialogFreeMode.onDefault(builder.DialogAction.send("Sorry, I didn´t understand your question."));
    return dialogFreeMode;
}
