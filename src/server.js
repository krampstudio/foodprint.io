
const express = require('express');
const app = express();

 app.use(express.static('public'));

app.get('/hello',  (req, res) => res.send({ hello : 'wolrd'}));

const server = app.listen(3000, 'localhost', () =>  {
    const host = server.address().address;
    const port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});
