const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const compareRouter = require('./server/routes/compare');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

const publicDir = path.join(__dirname);
app.use(express.static(publicDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/compare', compareRouter);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Rota não encontrada.' });
  }
  return next();
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Erro interno no servidor.' });
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
