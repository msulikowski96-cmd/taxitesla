const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;
createApp().listen(port, () => {
  console.log(`TaxiTesla API: http://localhost:${port}/api/health`);
  console.log(`Panel dyspozytora: http://localhost:${port}/admin/`);
});
