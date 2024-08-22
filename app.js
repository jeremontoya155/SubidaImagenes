require('dotenv').config();
const express = require('express');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Configurar almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads', // Carpeta en Cloudinary
    format: async (req, file) => 'png', // o 'jpeg'
    public_id: (req, file) => file.originalname.split('.')[0],
  },
});

const upload = multer({ storage: storage });

// Configurar PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Configurar EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal para mostrar el formulario de subida
app.get('/', (req, res) => {
  res.render('index');
});

// Ruta para subir imágenes
app.post('/upload', upload.single('image'), async (req, res) => {
  const imageUrl = req.file.path;
  const imageName = req.file.originalname.split('.')[0];

  try {
    // Guardar la URL de la imagen en la base de datos
    const result = await pool.query('INSERT INTO images (name, url) VALUES ($1, $2) RETURNING *', [imageName, imageUrl]);

    res.render('upload', {
      message: 'Imagen subida correctamente',
      imageUrl: result.rows[0].url, // URL de la imagen en Cloudinary
    });
  } catch (error) {
    console.error(error);
    res.render('upload', { message: 'Error al subir la imagen', imageUrl: null });
  }
});

// Ruta para mostrar todas las imágenes
app.get('/images', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM images');
    res.render('images', { images: result.rows });
  } catch (error) {
    console.error(error);
    res.render('images', { images: [] });
  }
});

// Obtener el puerto desde el archivo .env o usar 7500 por defecto
const PORT = process.env.PORT || 7500;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
