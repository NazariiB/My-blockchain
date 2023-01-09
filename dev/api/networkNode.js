const express = require('express')
const app = express();
const bodyParser = require('body-parser');
const Blockchain = require('../blockchainFunctions/blockchain');
const { v4 } = require('uuid');
const morgan = require('morgan');
const rp = require('request-promise');
const port = process.argv[2];
const path = require('path');
const { exec } = require('node:child_process');

const nodeAddress = v4().split('-').join('');

const bitcoin = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan(function (tokens, req, res) {
    return [
        req.headers.host.split(':')[1],
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens.res(req, res, 'content-length'), '-',
        tokens['response-time'](req, res), 'ms'
    ].join(' ')
}))

app.get('/blockchain', (req, res) => {
    res.send(bitcoin);
})

app.post('/transaction', (req, res) => {
    const newTransaction = req.body;

    const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction);
    res.json({ blockIndex })
})

app.post('/transaction-broadcast', (req, res) => {
    const newTransaction = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recepient);
    // const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction);

    const requestPromises = [];
    bitcoin.networkNodes.forEach(node => {
        const requestOptions = {
            uri: node + '/transaction',
            method: 'POST',
            body: {
                amount: newTransaction.amount,
                sender: newTransaction.sender,
                recepient: newTransaction.recepient,
                transactionId: newTransaction.transactionId
            },
            json: true
        };

        requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises)
        .then(data => {
            res.json({ newTransaction });
        })
})

app.get('/mine', (req, res) => {
    const lastBlock = bitcoin.getLatestblock();
    const previousHash = lastBlock['hash'];
    const currentBlockData = {
        transactions: bitcoin.pendingTransactions,
        index: lastBlock['index'] + 1
    }
    const nonce = bitcoin.proofOfWork(previousHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(previousHash, currentBlockData, nonce);

    const newBlock = bitcoin.createNewBlock(nonce, previousHash, blockHash);

    const requestPromises = [];
    bitcoin.networkNodes.forEach(node => {
        const requestOptions = {
            uri: node + '/new-block',
            method: 'POST',
            body: { newBlock },
            json: true
        };

        requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises)
        .then(data => {
            const newRequest = {
                uri: bitcoin.currentNodeURL + '/transaction-broadcast',
                method: 'POST',
                body: {
                    amount: 12.5,
                    sender: '00',
                    recepient: nodeAddress
                },
                json: true
            }
            return rp(newRequest)
        })
        .then(data => {
            res.json({ newBlock })
        })

})

// register a node and brodcast it the network 
app.post('/register-node-and-broadcast-node', (req, res) => {
    const newNodeURL = req.body.newNodeURl;
    bitcoin.addNode(newNodeURL)

    const reqNodesPromises = [];
    bitcoin.networkNodes.forEach(networkNode => {
        const requestOptions = {
            uri: networkNode + '/register-node',
            method: 'POST',
            body: { newNodeURL },
            json: true
        };

        reqNodesPromises.push(rp(requestOptions))
    })

    Promise.all(reqNodesPromises)
        .then(data => {
            const bulkRegisterOptions = {
                uri: newNodeURL + '/register-nodes-bulk',
                method: 'POST',
                body: {
                    allNodesURL: [...bitcoin.networkNodes, bitcoin.currentNodeURL]
                },
                json: true
            }
            return rp(bulkRegisterOptions);
        })
        .then(data => {
            res.json();
        });
})

app.post('/new-block', (req, res) => {
    const newBlock = req.body.newBlock;
    const lastBlock = bitcoin.getLatestblock();
    if (lastBlock.hash === newBlock.previousBlockHash &&
        lastBlock['index'] + 1 === newBlock['index']) {
        const block = bitcoin.createNewBlock(newBlock.nonce, newBlock.previousBlockHash, newBlock.hash);
        res.json({ block })
    } else {
        res.status(400)
        res.json({})
    }
})

// register a node with the network
app.post('/register-node', (req, res) => {
    const newNodeURL = req.body.newNodeURL;
    bitcoin.addNode(newNodeURL);
    res.json();
})

app.post('/register-nodes-bulk', (req, res) => {
    bitcoin.addNodes(req.body.allNodesURL);
    res.json();
})

app.get('/consensus', function (req, res) {
    const requestPromises = [];
    bitcoin.networkNodes.forEach(node => {
        const requestOptions = {
            uri: node + '/blockchain',
            method: 'GET',
            json: true
        };

        requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises)
        .then(blockchains => {
            let maxChainLength = bitcoin.chain.length;
            let newLongestChain = null;
            let newPendingTransactions = null;

            blockchains.forEach(blockchain => {

                if (blockchain.chain.length > maxChainLength) {
                    maxChainLength = blockchain.chain.length;
                    newLongestChain = blockchain.chain;
                    newPendingTransactions = blockchain.pendingTransactions;
                };
            });


            if (!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))) {
                res.json({
                    note: 'Current chain has not been replaced.',
                    chain: bitcoin.chain
                });
            } else {
                bitcoin.chain = newLongestChain;
                bitcoin.pendingTransactions = newPendingTransactions;
                res.json({
                    note: 'This chain has been replaced.',
                    chain: bitcoin.chain
                });
            }
        });
});


app.get('/block/:blockhash', (req, res) => {
    const blockhash = req.params.blockhash;
    const block = bitcoin.getBlockByHash(blockhash);
    res.json({ block: block });
})

app.get('/transaction/:transactionId', (req, res) => {
    const transactionId = req.params.transactionId;
    const transaction = bitcoin.getTransaction(transactionId);
    res.json(transaction)
})

app.get('/address/:address', (req, res) => {
    const address = req.params.address;
    const addressData = bitcoin.getAddressData(address);

    res.json({ addressData });
})


app.get('/block-explorer', (req, res) => {
    res.sendFile(path.join(__dirname, '../blockExplorer/index.html'))
})

app.post('/kill-blockchain', (req, res) => {
    const pids = req.body;
    bitcoin.networkNodes.forEach(node => {
        console.log('asdasdadasd' + node)
        setTimeout(() => {
            exec('taskkill /pid ' + pids[node] + ' /T /F', (error, stdout, stderr) => {
              if (error) {
                console.error(`exec error: ${error}`);
                return;
              }
              console.log(`stdout: ${stdout}`);
              console.error(`stderr: ${stderr}`);
            });
        }, 1000)
    })
    exec('taskkill /pid ' + pids[bitcoin.currentNodeURL] + ' /T /F', (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });
})

app.listen(port, () => console.log('api started at port ' + port))