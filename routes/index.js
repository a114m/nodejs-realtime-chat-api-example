const express = require('express');
const router = express.Router();
const path = require('path');


router.get('/dev', (req, res, next) => {
  res.sendfile(path.resolve('views/dev_chat.html'));
});

router.get('/user', (req, res, next) => {
  res.sendfile(path.resolve('views/user_chat.html'));
});

module.exports = router;
