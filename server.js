const express = require('express');
const app = express();
const expbs = require('express-handlebars');
const path = require('path');
const { title } = require('process');
const router = require('./routes/routing')

const fsa = require('fs')


const hbsa = expbs.create({
    defaultLayout: 'main',
    partialsDir: 'views/pieces',
    extname: '.hbs'

    // Create custom helpers

});


app.engine('.hbs', hbsa.engine);
app.set('view engine', '.hbs');

//app.use('/testing', router);

//app.use('/', router) 

 // this works
// app.use('/about', function(req, res, next){
//     var old_url = req.baseUrl
//     req.baseUrl = 'index'
//     console.log('foo: ' + old_url + ' -> ' + req.url);
//     next()
//   });

//app.use(router)


//app.use('/about', router);




app.use(router);


app.listen(8080, () => {
    console.log('Server is starting at port ', 8080);
});