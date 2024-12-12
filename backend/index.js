const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Importar bcrypt para cifrar contraseñas

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    // password: 'tu_contraseña', // Asegúrate de proporcionar la contraseña correcta
    database: 'BANCA_MOVIL'
});

connection.connect(err => {
  if (err) {
    console.error('Error conectando a la base de datos: ', err.stack);
    return;
  }
  console.log('Conectado a la base de datos como id ' + connection.threadId);
});

// Ruta para iniciar sesión
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Recibido POST /login con:', email, password); // Mensaje de depuración

  const query = `
    SELECT usuarios.id, usuarios.nombre, transacciones.monto 
    FROM usuarios 
    LEFT JOIN transacciones ON usuarios.id = transacciones.usuario_id 
    WHERE usuarios.email = ? AND usuarios.contraseña = ?
  `;
  connection.query(query, [email, password], (error, results) => {
    if (error) {
      console.error('Error en la consulta a la base de datos:', error); // Mensaje de depuración
      return res.status(500).send(error);
    }
    if (results.length > 0) {
      const user = results[0];
      console.log('Transacciones obtenidas:', results); // Mensaje de depuración
      console.log('Inicio de sesión exitoso para:', email); // Mensaje de depuración

      // Generar el token
      const token = jwt.sign({ userId: user.id, email: email }, 'secretKey', { expiresIn: '1h' });
      
      // Agrupar transacciones del usuario
      const transactions = results.map(r => r.monto).filter(monto => monto !== null);
      console.log('Transacciones filtradas:', transactions); // Mensaje de depuración
      res.status(200).json({ success: true, user: user.nombre, token, transactions });
    } else {
      console.log('Credenciales incorrectas para:', email); // Mensaje de depuración
      res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
  });
});


// Ruta para registrar un nuevo usuario
app.post('/register', async (req, res) => {
  const { nombreUsuario, correo, contrasena } = req.body;

  try {
    console.log('Datos recibidos para registro:', { nombreUsuario, correo, contrasena }); // Mensaje de depuración
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);
    console.log('Contraseña cifrada:', hashedPassword); // Mensaje de depuración

    const query = 'INSERT INTO usuarios (nombre, email, contraseña) VALUES (?, ?, ?)';
    connection.query(query, [nombreUsuario, correo, hashedPassword], (error, results) => {
      if (error) {
        console.error('Error en la inserción de usuario:', error); // Mensaje de depuración
        return res.status(500).send(error);
      }
      console.log('Usuario creado:', results);
      res.status(201).json({ success: true });
    });
  } catch (err) {
    console.error('Error al cifrar la contraseña:', err); // Mensaje de depuración
    res.status(500).send(err);
  }
});

app.post('/check-balance', async (req, res) => {
  const { userId, amount } = req.body;

  try {
    const [rows] = await db.query(`
      SELECT SUM(monto) AS total 
      FROM transacciones 
      WHERE usuario_id = ?
    `, [userId]);

    const total = rows[0]?.total || 0;

    if (total >= amount) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Fondos insuficientes' });
    }
  } catch (error) {
    console.error('Error al verificar el saldo:', error);
    res.status(500).json({ success: false, message: 'Error al verificar el saldo' });
  }
});

app.post('/transfer', async (req, res) => {
  const { senderEmail, receiverEmail, amount } = req.body;

  try {
    const [[{ total }]] = await db.query(`
      SELECT SUM(monto) AS total 
      FROM transacciones 
      WHERE usuario_id = (SELECT id FROM usuarios WHERE email = ?)
    `, [senderEmail]);

    if (total < amount) {
      return res.json({ success: false, message: 'Fondos insuficientes' });
    }

    await db.query(`
      INSERT INTO transacciones (monto, usuario_id, email_id) VALUES (?, (SELECT id FROM usuarios WHERE email = ?), ?)
    `, [-amount, senderEmail, senderEmail]); // Se resta del remitente

    await db.query(`
      INSERT INTO transacciones (monto, usuario_id, email_id) VALUES (?, (SELECT id FROM usuarios WHERE email = ?), ?)
    `, [amount, receiverEmail, receiverEmail]); // Se suma al receptor

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al realizar la transferencia' });
  }
});


app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
