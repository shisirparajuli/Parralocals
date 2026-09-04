const express = require('express');
const { login } = require('../controllers/adminController');

const router = express.Router();

router.post('/admin/login', login);

module.exports = router;
