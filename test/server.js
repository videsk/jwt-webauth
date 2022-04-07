const express = require("express");
const app = express();
const server = require("http").createServer(app);
const jwt = require("jsonwebtoken");
const authorization = require('auth-header');
const bodyParser = require('body-parser');

app.use(bodyParser.json());

const jwtOptionsAccessToken = {
  secret: "b98U897b6r5567y89NM0m",
  expiresIn: "2s"
};

const jwtOptionsRefreshToken = {
  secret: "zny283en2837eze23e23e",
  expiresIn: "3s"
};

// Set node app trust in proxy
app.set("trust proxy", true);

// Create and send a new access token in endpoint /access-token
app.get("/login", function (req, res) {
  // Create JWT
  const accessToken = jwt.sign(
      { iat: Math.floor(new Date().getTime() / 1000) },
      jwtOptionsAccessToken.secret,
      { expiresIn: jwtOptionsAccessToken.expiresIn }
  );
  const refreshToken = jwt.sign(
      { iat: Math.floor(new Date().getTime() / 1000) },
      jwtOptionsRefreshToken.secret,
      { expiresIn: jwtOptionsRefreshToken.expiresIn }
  );
  // Set response have JSON format
  res.header("Content-Type", "application/json");
  // Send response
  res.json({
    accessToken,
    refreshToken
  });
});

app.get("/login-expired", function (req, res) {
  // Create JWT
  const accessToken = jwt.sign(
      { iat: Math.floor(new Date().getTime() / 1000) },
      jwtOptionsAccessToken.secret,
      { expiresIn: 1 }
  );
  const refreshToken = jwt.sign(
      { iat: Math.floor(new Date().getTime() / 1000) },
      jwtOptionsRefreshToken.secret,
      { expiresIn: jwtOptionsRefreshToken.expiresIn }
  );
  // Set response have JSON format
  res.header("Content-Type", "application/json");
  // Send response
  res.json({
    accessToken,
    refreshToken
  });
});

app.get("/check-token", function (req, res) {
  try {
    const {token: accessToken} = authorization.parse(req.header('Authorization'));
    // Validate JWT
    jwt.verify(accessToken, jwtOptionsAccessToken.secret);
    // Set response have JSON format
    res.header("Content-Type", "application/json");
    // Send response
    res.json({ message: 'The accessToken is valid.' });
  } catch (e) {
    res.status(401);
    res.json({ message: e.message });
  }
});

app.post("/refresh-token", function (req, res) {
  try {
    const {refreshToken} = req.body;
    jwt.verify(refreshToken, jwtOptionsRefreshToken.secret);

    const accessToken = jwt.sign(
        { iat: Math.floor(new Date().getTime() / 1000) },
        jwtOptionsAccessToken.secret,
        { expiresIn: jwtOptionsAccessToken.expiresIn }
    );
    // Set response have JSON format
    res.header("Content-Type", "application/json");
    res.status(201);
    // Send response
    res.json({ accessToken });
  } catch (e) {
    res.status(401);
    res.json({ message: e.message });
  }
});

// Handle exceptions
process.on("uncaughtException", function (err) {});
// Handle rejections
process.on("unhandledRejection", function (reason, p) {});

module.exports = {
  jwtOptionsAccessToken,
  jwtOptionsRefreshToken,
  server,
};
