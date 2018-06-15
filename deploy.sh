#!/bin/sh

BUCKET=$1
LN_STACK=$2
STACK_NAME=$3
BASEDIR=$(pwd)

NODEVERSION=$(node --version)

if [ "$BUCKET" == "" ] ;
then
  echo "Bucket name is missing"
  exit 1;
fi

if [ "$LN_STACK" == "" ] ;
then
  LN_STACK=Dev
fi

if [ "$STACK_NAME" == "" ] ;
then
  STACK_NAME="${BUCKET}";
fi

if [ ! "$NODEVERSION" == "v6.10.1" ] ;
then
    echo "Node version must be 6.10.1"
    exit 1
fi

for d in ./functions/* ;
do
    cd ${BASEDIR}/${d} && rm -rf node_modules && npm install --production ;
done

cd ${BASEDIR};

aws cloudformation package \
    --template-file cloudformation.json \
    --s3-bucket ${BUCKET} \
    --output-template-file output.yml \
    && aws cloudformation deploy \
        --template-file output.yml \
        --stack-name ${STACK_NAME} \
        --capabilities CAPABILITY_IAM \
        --parameter-overrides LNStack=${LN_STACK}
