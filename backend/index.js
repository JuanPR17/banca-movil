const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors'); // Importa el módulo CORS

const app = express();
const port = 3000;

app.use(cors()); // Habilita CORS
app.use(bodyParser.json());

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    //password: 'tu_contraseña', // Asegúrate de descomentar y proporcionar la contraseña correcta
    database: 'BANCA_MOVIL'
});

connection.connect(err => {
  if (err) {
    console.error('Error conectando a la base de datos: ', err.stack);
    return;
  }
  console.log('Conectado a la base de datos como id ' + connection.threadId);
});

app.get('/usuarios', (req, res) => {
  console.log('Solicitud GET /usuarios recibida'); // Mensaje de depuración
  connection.query('SELECT * FROM usuarios', (err, results) => {
    if (err) {
      console.error('Error en la consulta a la base de datos:', err); // Mensaje de depuración
      return res.status(500).send(err);
    }
    console.log('Resultados de la consulta:', results); // Mensaje de depuración
    res.json(results);
  });
});

app.get('/transacciones', (req, res) => {
  console.log('Solicitud GET /transacciones recibida'); // Mensaje de depuración
  connection.query('SELECT * FROM transacciones', (err, results) => {
    if (err) {
      console.error('Error en la consulta a la base de datos:', err); // Mensaje de depuración
      return res.status(500).send(err);
    }
    console.log('Resultados de la consulta:', results); // Mensaje de depuración
    res.json(results);
  });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

