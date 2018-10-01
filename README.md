# Integración Opcionales

## Deploy



```
aws s3 mb s3://integracion-opcionales-<YOUR_NICKNAME>

aws cloudformation package --template-file cloudformation.json --s3-bucket integracion-opcionales-<YOUR_NICKNAME> --output-template-file output.yml

aws cloudformation deploy --template-file output.yml --stack-name sqs-lambda-example --capabilities CAPABILITY_NAMED_IAM
```

// Part of https://github.com/chris-rock/node-crypto-examples

// Nodejs encryption with CTR
var crypto = require('crypto'),
    algorithm = 'aes-256-cbc',
    password = 'lanacion';

function encrypt(text){
  var cipher = crypto.createCipher(algorithm,password);
  var crypted = cipher.update(text,'utf8','hex');
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text){
  var decipher = crypto.createDecipher(algorithm,password);
  var dec = decipher.update(text,'hex','utf8');
  dec += decipher.final('utf8');
  return dec;
}

var hw = encrypt("hello world");
// outputs hello world
console.log(hw);
console.log(decrypt(hw));