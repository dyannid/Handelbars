const express = require('express');
const app = express();
const expbs = require('express-handlebars');
const path = require('path');
const { title } = require('process');
const hbs = expbs.create();

// app.engine('handlebars', expbs.engine({defaultLayout: false}));

/* app.engine('handlebars', expbs.engine({
    defaultLayout: 'main',
    layoutsDir: path.join(_dirname, 'views/test')
})); */

app.engine('.hbs', expbs.engine({
    defaultLayout: 'main',
    partialsDir: 'views/pieces',
    extname: '.hbs'
}));
app.set('view engine', '.hbs');

// Routing
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Home Page', 
        name: 'Yannide Djache',
        isDisplayName: false
    });
});

app.get('/about', (req, res) => {
    res.render('about', {
        title: 'About Page',
        description: 'je suis une page cool!!!',

    });
});

app.get('/dashboard', (req, res) => {
    res.render('dashboard', {
        title: 'dashboard Page',
        isListEnable: false
    });
});

app.get('/each/helper', (req, res) => {
    res.render('contact', {
        title: 'contact Page',
        people: [
            "James",
            "Peter",
            "Sadrack",
            "Morissa"
        ],

        user: {
            username: 'djache',
            age: 20,
            phone: 464725
        },

        lists: [
            {
                items: ['Mango', 'Banana', 'Pineaple']
            },

            {
                items: ['Potatoe', 'Manioc', 'Avocado']
            },
        ]
    });
});

app.get('/look', (req, res) => {
    res.render('lookup', {
        title: 'Lookup Page',
        isListEnable: false,
        user: {
            username: 'djache',
            age: 20,
            phone: 464725
        }
    });
});


app.listen(8080, () => {
    console.log('Server is starting at port ', 8080);
});