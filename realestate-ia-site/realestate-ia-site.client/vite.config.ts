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

const certificateName = "realestate-ia-site.client";
const certFilePath = path.join(baseFolder, `${certificateName}.pem`);
const keyFilePath = path.join(baseFolder, `${certificateName}.key`);

// Detectar se está em ambiente de CI/CD
const isCI = env.CI === 'true' || env.GITHUB_ACTIONS === 'true' || env.AZURE_STATIC_WEB_APPS_API_TOKEN;

// Só tentar criar certificados se não estiver em CI
if (!isCI) {
    if (!fs.existsSync(baseFolder)) {
        fs.mkdirSync(baseFolder, { recursive: true });
    }

    if (!fs.existsSync(certFilePath) || !fs.existsSync(keyFilePath)) {
        if (0 !== child_process.spawnSync('dotnet', [
            'dev-certs',
            'https',
            '--export-path',
            certFilePath,
            '--format',
            'Pem',
            '--no-password',
        ], { stdio: 'inherit', }).status) {
            console.warn("Could not create certificate. Running without HTTPS.");
        }
    }
}

const target = env.ASPNETCORE_HTTPS_PORT ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}` :
    env.ASPNETCORE_URLS ? env.ASPNETCORE_URLS.split(';')[0] : 'https://localhost:7027';

// Configurar HTTPS apenas se não estiver em CI e os certificados existirem
let httpsConfig = undefined;
if (!isCI && fs.existsSync(certFilePath) && fs.existsSync(keyFilePath)) {
    try {
        httpsConfig = {
            key: fs.readFileSync(keyFilePath),
            cert: fs.readFileSync(certFilePath),
        };
    } catch (error) {
        console.warn("Could not read certificates. Running without HTTPS.");
    }
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    build: {
        // Otimizações básicas de build
        target: 'es2020',
        minify: 'esbuild',
        outDir: 'dist',
        rollupOptions: {
            output: {
                // Chunk splitting simples
                manualChunks: {
                    'react-vendor': ['react', 'react-dom'],
                    'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
                    'utils-vendor': ['axios', 'clsx', 'tailwind-merge', 'sonner']
                }
            }
        }
    },
    server: {
        proxy: {
            '^/api': {
                target,
                secure: false,
                changeOrigin: true
            }
        },
        port: parseInt(env.DEV_SERVER_PORT || '64222'),
        https: httpsConfig
    }
})
