app.get('/test', (req, res) => {
    res.redirect('/');
    res.send('hello test'+req.originalUrl.replace('/',''))
  });

// respond with "hello world" when a GET request is made to the homepage
app.get('/', (req, res) => {
   console.log(req.originalUrl);
  res.send('hello world testing')
});