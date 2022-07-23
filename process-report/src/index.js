import { fork } from 'child_process';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises'
import { Writable } from 'stream';
import csvtojson from 'csvtojson';

const databaseFile = './data/All_Pokemon.csv';
const PROCESS_COUNT = 30;
const replications = [];

const backgroundTaskFile = './src/backgroundTask.js';
const processes = new Map();

for(let index = 0; index < PROCESS_COUNT; index++) {
    const child = fork(backgroundTaskFile, [databaseFile]);
    child.on('exit', () => {
        console.log(`Process ${child.pid} exited`);
        processes.delete(child.pid);
    });
    child.on('error', (error) => {
        console.log(`Process ${child.pid} has an error`, error);
        process.exit(1);
    });
    child.on('message', (msg) => {
        //multiprocessing workaround 
        if(replications.includes(msg)) return;
        
        console.log(`${msg} is replicated!`);
        replications.push(msg);
    });
    processes.set(child.pid, child);
}

function roundRobin(processArray, index = 0) {
    return function() {
        if(index >= processArray.length) index = 0;

        return processArray[index++];
    }
}

// Connection pool
const getProcess = roundRobin([...processes.values()]);
console.log(`Pool size: ${processes.size} processes`);

await pipeline(
    createReadStream(databaseFile),
    csvtojson(),
    Writable({
        write(chunk, enc, cb) {
            const chosenProcess = getProcess();
            chosenProcess.send(JSON.parse(chunk));
            cb();
        }
    })
);