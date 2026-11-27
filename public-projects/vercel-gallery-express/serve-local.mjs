import { fileURLToPath } from 'node:url';
import express from 'express';
import app from './src/index.ts';

app.use(express.static(fileURLToPath(new URL('./public/', import.meta.url))));
app.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '127.0.0.1');
