const serverlessExpress = require('@vendia/serverless-express');
const app = require('../scripts/custom_auth_backend.cjs');

const server = serverlessExpress({ app });

module.exports = (req, res) => server(req, res);
