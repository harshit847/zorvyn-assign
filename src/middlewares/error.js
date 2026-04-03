function handleErrors(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (err.isJoi) {
    return res.status(400).json({ error: err.details.map(d => d.message).join(', ') });
  }

  return res.status(status).json({ error: message });
}

module.exports = { handleErrors };