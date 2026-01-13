1234567890-=const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const NUM_CODES = 1000;
const CODES_FILE = 'activation_codes.txt';
const HASHES_FILE = 'valid_hashes.json';

const codes = [];
const hashes = [];

function generateCode() {
    // Generate a formatted code like XXXX-XXXX-XXXX-XXXX
    const buffer = crypto.randomBytes(8);
    const hex = buffer.toString('hex').toUpperCase();
    return `${hex.substring(0, 4)}-${hex.substring(4, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}`;
}

for (let i = 0; i < NUM_CODES; i++) {
    const code = generateCode();
    codes.push(code);

    // Hash the code
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    hashes.push(hash);
}

// Write the plaintext codes to a file for the user to sell
fs.writeFileSync(path.join(__dirname, CODES_FILE), codes.join('\n'));
console.log(`Generated ${NUM_CODES} codes in ${CODES_FILE}`);

// Write the hashes to a JSON file to be bundled with the app
fs.writeFileSync(path.join(__dirname, HASHES_FILE), JSON.stringify(hashes));
console.log(`Generated ${NUM_CODES} hashes in ${HASHES_FILE}`);
