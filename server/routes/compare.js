const express = require('express');
const { fetchAssetData, AssetError } = require('../services/assetService');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { assets, token } = req.body || {};
    if (!Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ message: 'Informe ao menos um ativo para comparação.' });
    }

    const results = await Promise.allSettled(
      assets.map((asset) => fetchAssetData(asset, token))
    );

    const fulfilled = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);

    const errors = results
      .filter((result) => result.status === 'rejected')
      .map((result) => {
        const reason = result.reason;
        return {
          ticker: reason?.ticker || null,
          message: reason?.message || 'Não foi possível carregar os dados do ativo.',
          status: reason?.status || null,
        };
      });

    if (!fulfilled.length) {
      const status = errors[0]?.status || 502;
      return res.status(status).json({
        message: errors[0]?.message || 'Não foi possível carregar os dados dos ativos.',
        errors,
      });
    }

    return res.json({ results: fulfilled, errors });
  } catch (error) {
    if (error instanceof AssetError) {
      return res.status(error.status || 400).json({
        message: error.message,
        errors: [{ ticker: error.ticker, message: error.message, status: error.status }],
      });
    }
    return next(error);
  }
});

module.exports = router;
