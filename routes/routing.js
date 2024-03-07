const express = require('express')

const router = express.Router();



// Routing



router.get('/about', (req, res) => {
    res.render('about', {
        title: 'About Page',
        description: 'je suis une page cool!!!'

    });
});

router.get('/dashboard', (req, res) => {
    res.render('dashboard', {
        title: 'dashboard Page',
        isListEnable: false
    });
});

router.get('/each/helper', (req, res) => {
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

router.get('/look', (req, res) => {
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

router.get('/dataTable', (req, res) => {
    res.render('dataTable', {
        title: 'dataTable Page',
        isListEnable: false,
        user: {
            username: 'djache',
            age: 20,
            phone: 464725
        }
    });
    
});

router.use('/', (req, res) => {
    console.log('hallo martial');
    console.log(req.originalUrl);
    res.redirect('/look');
    /*res.render('index', {
        title: 'Hom Page', 
        name: 'Yannide Djache',
        isDisplayName: true
    }); */
});

module.exports = router;