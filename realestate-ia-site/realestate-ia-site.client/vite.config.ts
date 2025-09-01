import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import { env } from 'process';

const baseFolder =
  env.APPDATA !== undefined && env.APPDATA !== ''
    ? `${env.APPDATA}/ASP.NET/https`
    : `${env.HOME}/.aspnet/https`;

const certificateName = 'realestate-ia-site.client';
const certFilePath = path.join(baseFolder, `${certificateName}.pem`);
const keyFilePath = path.join(baseFolder, `${certificateName}.key`);

// Allow disabling HTTPS via env flag (useful in CI/containers)
let useHttps = env.VITE_DISABLE_HTTPS !== 'true';

if (useHttps) {
  try {
    if (!fs.existsSync(baseFolder)) {
      fs.mkdirSync(baseFolder, { recursive: true });
    }

    const certMissing = !fs.existsSync(certFilePath) || !fs.existsSync(keyFilePath);

    if (certMissing) {
      const result = child_process.spawnSync(
        'dotnet',
        [
          'dev-certs',
          'https',
          '--export-path',
          certFilePath,
          '--format',
          'Pem',
          '--no-password',
        ],
        { stdio: 'ignore' }
      );

      if (result.status !== 0 || !fs.existsSync(certFilePath) || !fs.existsSync(keyFilePath)) {
        useHttps = false;
      }
    }
  } catch {
    useHttps = false;
  }
}

const target = env.ASPNETCORE_HTTPS_PORT
  ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}`
  : env.ASPNETCORE_URLS
  ? env.ASPNETCORE_URLS.split(';')[0]
  : 'https://localhost:7027';

export default defineConfig({
  plugins: [plugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '^/api': {
        target,
        secure: false,
      },
    },
    // Default to 5173 for better compatibility with common tooling; allow overrides
    port: parseInt(env.DEV_SERVER_PORT || env.PORT || '5173'),
    https: useHttps
      ? {
          key: fs.readFileSync(keyFilePath),
          cert: fs.readFileSync(certFilePath),
        }
      : false,
  },
});
