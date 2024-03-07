//|**********************************************************************;
//* Project           : Qa test results webpage
//*
//* Author            : Patrick Plamper
//*
//* Date created      : 10.11.2019
//*
//* Purpose           : Defines handlebars helper functions and implement
//*                     dynamic source binding
//*
//|**********************************************************************;

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var url = require('url');
var cookieParser = require('cookie-parser');
//var logger = require('morgan');
var hbs = require('express-handlebars');
var hbs_sec = require('express-handlebars-sections');
var fs = require('fs');
var cookieParser = require('cookie-parser');
var qa_test_resultsRouter = require('./routes/qa_test_results');
var app = express();

var hbs = hbs.create({
    helpers: {
        // Switch block needed for switch case
        switch: function(value, options) {
            this.switch_value = value;
            this.switch_break = false;
            return options.fn(this);
        },
        // Case block needed for switch case
        case: function(value, options) {
            if (value == this.switch_value) {
                this.switch_break = true;
                return options.fn(this);
            }
        },
        // Default return from switch case as tabel data html format
        default_td: function(value, options) {
           if (this.switch_break == false) {
               value = '<span class=fas fa-unlink aria-hidden="true"></span>';
               return value;
           }
        },
        // If condition
        ifCond: function(v1, v2, options) {
            if(v1 === v2) {
                return options.fn(this);
            }
            return options.inverse(this);
        },
        compare: function (lvalue, operator, rvalue, options) {

            var operators, result;

            if (arguments.length < 3) {
                throw new Error("Handlerbars Helper 'compare' needs 2 parameters");
            }

            if (options === undefined) {
                options = rvalue;
                rvalue = operator;
                operator = "===";
            }

            operators = {
                '==': function (l, r) { return l == r; },
                '===': function (l, r) { return l === r; },
                '!=': function (l, r) { return l != r; },
                '!==': function (l, r) { return l !== r; },
                '<': function (l, r) { return l < r; },
                '>': function (l, r) { return l > r; },
                '<=': function (l, r) { return l <= r; },
                '>=': function (l, r) { return l >= r; },
                'typeof': function (l, r) { return typeof l == r; }
            };

            if (!operators[operator]) {
                throw new Error("Handlerbars Helper 'compare' doesn't know the operator " + operator);
            }

            result = operators[operator](lvalue, rvalue);

            if (result) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }

        },
        // Define and save variable into system @root array
        setVariable: function (varName, varValue, options) {
            if (!options.data.root) {
                options.data.root = {};
            }
            options.data.root[varName] = varValue;
        },
        origin_url_name: function (options) {
          app.locals.orig_url_name = options;
          console.log(app.locals.orig_url_name );
        },
        // Splits one url into separated links. Each slash block from the url is one link.
        // This is need for the "Gray Bock Navigation"
        splitIntoMultipleLinks: function (varValue, options) {
            if ( typeof varValue !== 'undefined' && varValue ) {
                varValue = varValue.replace(/\/\s*$/, "");
                var html = "";
                var urls = varValue.split("/");
                var link = "/qa_test_results";

                if (typeof varValue === 'undefined') {
                    var varValue = ".";
                }

                urls.forEach(function(url){
                    link = link + '/' + url;
                    html =  html + '<a href="' + link +  '/" style="color: white;">' + url + '/</a>';
                });
                return '<p>' + html + '</p>';
            }
            else {}
        }
    },
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutDir: __dirname + '/views/layouts/'
});
hbs_sec(hbs);

// view engine setup
app.engine('hbs', hbs.engine);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.set('etag', false)

//app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/qa_test_results', express.static(path.join(__dirname, 'public')));
app.use('/qa_test_results/css', express.static(
  __dirname + '/node_modules/bootstrap/dist/css'));
app.use('/qa_test_results/fontawesome-free/css', express.static(
  __dirname + '/node_modules/@fortawesome/fontawesome-free/css'));
app.use('/qa_test_results/fontawesome-free/webfonts', express.static(
  __dirname + '/node_modules/@fortawesome/fontawesome-free/webfonts'));
app.use('/qa_test_results/css', express.static(__dirname + '/node_modules/venobox/venobox'));
app.use('/qa_test_results/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/qa_test_results/js', express.static(__dirname + '/node_modules/popper.js/dist/umd'));
app.use('/qa_test_results/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/qa_test_results/fontawesome-free/js', express.static(
  __dirname + '/node_modules/@fortawesome/fontawesome-free/js'));
app.use('/qa_test_results/js', express.static(__dirname + '/node_modules/venobox/venobox'));
app.use(cookieParser());

//app.use('/', indexRouter);
app.use('/qa_test_results', qa_test_resultsRouter);
app.use('/dev_test_results', qa_test_resultsRouter);
app.use('/cosy_test_results', qa_test_resultsRouter);
app.use(qa_test_resultsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

//disable cache
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setTimeout(0);
    next()
})

module.exports = app;
