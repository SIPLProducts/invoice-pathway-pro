// PM2 alternative to systemd (use ONE, not both):
//   cd /opt/dmr/middleware && pm2 start ecosystem.config.js && pm2 save && pm2 startup
// server.js loads ../.env (middleware/.env) itself via dotenv.
module.exports = {
  apps: [
    {
      name: "dmr-sap-middleware",
      script: "src/server.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      restart_delay: 5000,
      watch: false,
      max_memory_restart: "500M",
      env: { NODE_ENV: "production", HOST: "127.0.0.1" },
    },
  ],
};
