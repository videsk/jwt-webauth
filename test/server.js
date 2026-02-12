import express from 'express';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import authorization from 'auth-header';

const app = express();
const server = createServer(app);

// Express ya incluye el parsing de JSON, no necesitas 'body-parser' como dependencia extra
app.use(express.json());

export const secretAccessToken = "b98U897b6r5567y89NM0m";
export const secretRefreshToken = "zny283en2837eze23e23e";

export const jwtOptionsAccessToken = {
  secret: secretAccessToken,
  expiresIn: "2s"
};

export const jwtOptionsRefreshToken = {
  secret: secretRefreshToken,
  expiresIn: "3s"
};

app.set("trust proxy", true);

app.get("/login", (req, res) => {
  const iat = Math.floor(Date.now() / 1000);
  
  const accessToken = jwt.sign(
    { iat },
    jwtOptionsAccessToken.secret,
    { expiresIn: jwtOptionsAccessToken.expiresIn }
  );
  
  const refreshToken = jwt.sign(
    { iat },
    jwtOptionsRefreshToken.secret,
    { expiresIn: jwtOptionsRefreshToken.expiresIn }
  );

  res.json({ accessToken, refreshToken });
});

app.get("/login-expired", (req, res) => {
  const iat = Math.floor(Date.now() / 1000);
  
  const accessToken = jwt.sign(
    { iat },
    jwtOptionsAccessToken.secret,
    { expiresIn: 1 }
  );
  
  const refreshToken = jwt.sign(
    { iat },
    jwtOptionsRefreshToken.secret,
    { expiresIn: jwtOptionsRefreshToken.expiresIn }
  );

  res.json({ accessToken, refreshToken });
});

app.get("/check-token", (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const { token: accessToken } = authorization.parse(authHeader);
    
    jwt.verify(accessToken, jwtOptionsAccessToken.secret);
    
    res.json({ message: 'The accessToken is valid.' });
  } catch (e) {
    res.status(401).json({ message: e.message });
  }
});

app.post("/refresh-token", (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new Error('Refresh token required');

    jwt.verify(refreshToken, jwtOptionsRefreshToken.secret);

    const accessToken = jwt.sign(
      { iat: Math.floor(Date.now() / 1000) },
      jwtOptionsAccessToken.secret,
      { expiresIn: jwtOptionsAccessToken.expiresIn }
    );

    res.status(201).json({ accessToken });
  } catch (e) {
    res.status(401).json({ message: e.message });
  }
});

// Manejo de errores globales
process.on("uncaughtException", (err) => {
  // Aquí deberías loguear el error antes de decidir si matar el proceso
});

process.on("unhandledRejection", (reason, p) => {
  // Útil para capturar promesas sin .catch()
});

app.listen(3005, () => console.log("Server listening on port 3005"));

export { server, jwt };