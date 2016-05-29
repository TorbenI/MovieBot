/**
 * Created by torbenindorf on 17.05.16.
 */

var API_URL = 'http://api.themoviedb.org/3';
var API_KEY = '89298244cdf30c4264e81888dc561a61';
var movieDB = require('moviedb')(API_KEY);

module.exports = new function(){

    /* private fields*/
    function _suggestMovie(movieEntity){
        _filterActor(movieEntity.results);
    }

    function _movieGenreToID(genreName) {
        var result = -1;

        genreName = genreName.toLowerCase();

        if(genreName == 'action')
            result = 28;
        else if(genreName == 'adventure')
            result = 12;
        else if(genreName == 'animation')
            result = 16;
        else if(genreName == 'comedy')
            result = 35;
        else if(genreName == 'crime')
            result = 80;
        else if(genreName == 'drama')
            result = 18;
        else if(genreName == 'fantasy')
            result = 14;
        else if(genreName == 'horror')
            result = 27;
        else if(genreName == 'thriller')
            result = 53;
        else if(genreName == 'war')
            result = 10752;
        else if(genreName == 'western')
            result = 37;
        else {
            result = -1;
            console.log(genreName);
        }
        return result;
    }

    function _filterActor(dbResult, callback) {
        var bestActor, index;

        for(index = 0; index < dbResult.length; ++index) {
            var actor = dbResult[index];
            if(!bestActor)
                bestActor = actor;
            else {
                if(bestActor.popularity < actor.popularity)
                    bestActor = entry;
            }
        }

        if(bestActor) {
            var result = [];

            for(var index = 0; index < bestActor.known_for.length; ++index) {
                result.push(bestActor.known_for[index]);
            }
            return callback(result);
        }
        else
            console.log('Error');
    }



    return{

        searchActor: function (builder, args, callback)
        {
            var firstName = builder.EntityRecognizer.findEntity(args.entities, 'Actor::Firstname');
            var lastName = builder.EntityRecognizer.findEntity(args.entities, 'Actor::Lastname');
            var videoType = builder.EntityRecognizer.findEntity(args.entities, 'VideoType');
            var genre = builder.EntityRecognizer.findEntity(args.entities, 'Genre').entity;

            movieDB.searchPerson({query: firstName.entity + ' ' + lastName.entity}, function (err, res) {

                var genreID = -1;
                var type;
                if(genre)
                    genreID = _movieGenreToID(genre);

                if(videoType == 'movies' || videoType == 'movie')
                    type = 'movie';
                else if(videoType == 'series' || videoType == 'serie')
                    type = 'tv';
                else
                    type = 'movie';

                if(res.results.length > 0 && genreID > 0)
                {
                    var requestify = require('requestify');
                    var getURL = API_URL + '/discover/' + type + '?with_genres=' + genreID + '&with_cast=' + res.results[0].id + '&certification_country=ger&sort_by=popularity.desc' + '&api_key=' + API_KEY;

                    if(genreID != -1)
                        getURL = getURL + '&with_genres=' + genreID;

                     requestify.get(getURL).then(function(response) {
                        // Get the response body
                        var body = response.getBody();
                        var movieResult = body.results;

                        if(movieResult.length > 0) {
                            var result = [];

                            for(var index = 0; index < movieResult.length; ++index) {
                                result.push(movieResult[index]);
                            }

                        return callback(result);
                        }
                     });
                } else {
                    _filterActor(res.results, callback);
                }
            });
            // whatever
        },

        //Example: /discover/movie?primary_release_date.gte=2014-09-15&primary_release_date.lte=2014-10-22
        moviesInTheatre: function(callback) {
            var dateFormat = require('dateformat');
            var requestify = require('requestify');

            var currentDate = dateFormat(new Date(), "yyyy-mm-dd");
            var tempDate = new Date();
            tempDate.setDate(tempDate.getDate()-7);
            var oldDate = dateFormat(tempDate, "yyyy-mm-dd");

            requestify.get(API_URL + '/discover/movie?primary_release_date.gte=' + oldDate + '&certification_country=ger&primary_release_date.lte='+ currentDate +'&api_key=' + API_KEY).then(function(response) {
                // Get the response body
                var body = response.getBody();
                var movieResult = body.results;

                if(movieResult.length > 0) {
                    var result = [];

                    for(var index = 0; index < movieResult.length; ++index) {
                        result.push(movieResult[index]);
                    }

                    return callback(result);
                }
            });
        },

        bestMoviesInYear: function(builder, callback) {

            var requestify = require('requestify');
            var type;
            var releaseYear = builder.EntityRecognizer.findEntity(args.entities, 'ReleaseYear');
            var videoType = builder.EntityRecognizer.findEntity(args.entities, 'VideoType');
            var genre = builder.EntityRecognizer.findEntity(args.entities, 'Genre');

            var genreID = -1;
            if(genre)
                genreID = _movieGenreToID(genre);

            if(videoType == 'movies' || videoType == 'movie')
                type = 'movie';
            else if(videoType == 'series' || videoType == 'serie')
                type = 'tv';
            else
                type = 'movie';

            var getURL = API_URL + '/discover/' + type + '?primary_release_year=' + releaseYear + '&certification_country=ger&sort_by=popularity.desc' + '&api_key=' + API_KEY;

            if(genreID != -1)
                getURL = getURL + '&with_genres=' + genreID;

            requestify.get(getURL).then(function(response) {
                // Get the response body
                var body = response.getBody();
                var movieResult = body.results;

                if(movieResult.length > 0) {
                    var result = [];

                    for(var index = 0; index < movieResult.length; ++index) {
                        result.push(movieResult[index]);
                    }
                    return callback(result);
                }
            });
        }
    }
}