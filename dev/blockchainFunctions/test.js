const Blockchain = require('./blockchain');

const bitcoin = new Blockchain();


bitcoin.createNewTransaction(123, '0xA', '0xB');

bitcoin.createNewBlock(123, '0x0000000000', '0x0asd');



console.log(bitcoin.chain[0]); 