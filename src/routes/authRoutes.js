const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/login', (req, res) => {
  res.render('login');
});

router.get('/google',
  passport.authenticate('google', { scope: ['email', 'profile'] })
);

router.get('/google/callback',
  passport.authenticate('google', {
    successRedirect: '/openai',
    failureRedirect: '/auth/login'
  })
);

router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

module.exports = router; 