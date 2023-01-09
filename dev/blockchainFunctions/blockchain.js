const sha256 = require('sha256');
const { v4 } = require('uuid');
const currentNodeURL = process.argv[3]

function Blockchain() {
    this.chain = [];
    this.pendingTransactions = [];

    this.currentNodeURL = currentNodeURL;
    this.networkNodes = [];

    this.createNewBlock(0, '0', '0');
}


Blockchain.prototype.addNode = function (newNode) {
    if (!this.networkNodes.includes(newNode) && this.currentNodeURL !== newNode) {
        this.networkNodes.push(newNode);
    }
}


Blockchain.prototype.addNodes = function (nodes) {
    for (const node of nodes) {
        this.addNode(node)
    }
}



Blockchain.prototype.createNewBlock = function (nonce, previousBlockHash, hash) {
    const newBlock = {
        index: this.chain.length + 1,
        timestamp: Date.now(),
        transaction: this.pendingTransactions,
        nonce,
        hash,
        previousBlockHash
    }

    this.pendingTransactions = [];
    this.chain.push(newBlock);

    return newBlock;
}

Blockchain.prototype.getLatestblock = function () {
    return this.chain[this.chain.length - 1];
}

Blockchain.prototype.createNewTransaction = function (amount, sender, recepient) {
    const newTransaction = {
        amount,
        sender,
        recepient,
        transactionId: v4().split('-').join('')
    }

    this.pendingTransactions.push(newTransaction);
    return newTransaction;
}

Blockchain.prototype.addTransactionToPendingTransactions = function (transaction) {
    this.pendingTransactions.push(transaction);
    return this.getLatestblock()['index'] + 1;
}

Blockchain.prototype.hashBlock = function (previousBlockHash, currentBlockData, nonce) {
    const dataString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    const hash = sha256(dataString);
    return hash;
}

Blockchain.prototype.proofOfWork = function (previousBlockHash, currentBlockData) {
    let nonce = 0;
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    while (hash.substring(0, 4) !== '0000') {
        hash = this.hashBlock(previousBlockHash, currentBlockData, ++nonce);
    }

    return nonce;
}

Blockchain.prototype.chainIsValid = function (blockchain) {
    for (let i = 1; i < blockchain.length; i++) {
        const currentBlock = blockchain[i];
        const prevBlock = blockchain[i - 1];
        const hash = this.hashBlock(prevBlock['hash'], { transactions: currentBlock['transaction'], index: currentBlock['index'] }, currentBlock['nonce']);
        if (currentBlock['previousBlockHash'] !== prevBlock['hash'] && hash.substring(0, 4) !== '0000') {
            return false;
        }
    }

    if (blockchain[0]['nonce'] !== 0
        || blockchain[0]['previousBlockHash'] !== '0'
        || blockchain[0]['hash'] !== '0'
        || blockchain[0]['transaction'].length !== 0) {
        return false
    }
    return true;
}

Blockchain.prototype.getBlockByHash = function (hash) {
    const block = this.chain.filter(block => block.hash === hash);
    return block.length > 0 ? block[0] : null;
}

Blockchain.prototype.getTransaction = function (transactionId) {
    let correctTransaction = null;
    let correctBlock = null;

    this.chain.forEach(block => {
        block.transaction.forEach(transaction => {
            if (transaction.transactionId === transactionId) {
                correctTransaction = transaction;
                correctBlock = block;
            };
        });
    });

    return {
        transaction: correctTransaction,
        block: correctBlock
    };
}

Blockchain.prototype.getAddressData = function (address) {
    const addressTransactions = [];
    this.chain.forEach(block => {
        block.transaction.forEach(transaction => {
            if (transaction.sender === address || transaction.recipient === address) {
                addressTransactions.push(transaction);
            };
        });
    });

    let balance = 0;
    addressTransactions.forEach(transaction => {
        if (transaction.recipient === address) {
            balance += transaction.amount;
        } else if (transaction.sender === address) {
            balance -= transaction.amount;
        }
    });

    return {
        addressTransactions: addressTransactions,
        addressBalance: balance
    };
}

module.exports = Blockchain;