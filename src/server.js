import express from 'express';
import alimentProvider from './provider/aliment';

const app = express();

app.use(express.static('public'));

app.get('/hello',  (req, res) => res.send({ hello : 'wolrd'}));

console.log(alimentProvider().search());

const server = app.listen(3000, 'localhost', () =>  {
    const host = server.address().address;
    const port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);


});
