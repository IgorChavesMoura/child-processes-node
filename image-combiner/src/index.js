import { createServer } from 'http';
import { parse, fileURLToPath } from 'url';
import { Worker } from 'worker_threads';

import { dirname } from 'path';

import sharp from 'sharp';

const currentFolder = dirname(fileURLToPath(import.meta.url));
const workerFileName = 'worker.js';

async function joinImages(images) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(`${currentFolder}/${workerFileName}`);
        worker.postMessage(images);
        worker.once('message', resolve);
        worker.once('error', reject);
        worker.once('exit', code => {
            if(code !== 0) return reject(new Error(`Thread ${worker.threadId} has stopped with exit code ${code}`));
            console.log(`Thread ${worker.threadId} has exited`);
        });
    });
}

async function handler(req, res) {
    if(req.url.includes('joinImages')) {
        const { query: { background, img } } = parse(req.url, true);
        const imgBase64 = await joinImages({
            image: img,
            background
        });

        res.writeHead(200, {
            'Content-type': 'text/html',
        });
        res.end(`<img style="height:100%;" src="data:image/jpeg;base64,${imgBase64}" />`);
        return;
    }

    return res.end('ok');
}

createServer(handler).listen(3000, () => console.log(`Running at 3000`));