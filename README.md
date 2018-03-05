# Integración Opcionales

## Deploy



```
aws s3 mb s3://integracion-opcionales-<YOUR_NICKNAME>

aws cloudformation package --template-file cloudformation.json --s3-bucket integracion-opcionales-<YOUR_NICKNAME> --output-template-file output.yml

aws cloudformation deploy --template-file output.yml --stack-name sqs-lambda-example --capabilities CAPABILITY_IAM
```
