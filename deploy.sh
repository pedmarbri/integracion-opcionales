#!/bin/sh

BUCKET=$1
LN_STACK=$2
STACK_NAME=$3
BASEDIR=$(pwd)

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
  STACK_NAME=$BUCKET;
fi

for d in ./functions/* ;
do
    cd $BASEDIR/$d && npm install --production ;
done

#aws cloudformation package --template-file cloudformation.json --s3-bucket $BUCKET --output-template-file output.yml &&\
#  aws cloudformation deploy --template-file output.yml --stack-name integracion-opcionales-dev --capabilities CAPABILITY_IAM --parameter-overrides LNStack=Dev