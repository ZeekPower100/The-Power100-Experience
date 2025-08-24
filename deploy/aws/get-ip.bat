@echo off
cd "C:\Program Files\Amazon\AWSCLIV2"
aws ec2 describe-instances --instance-ids i-04492d168b41611d5 --query "Reservations[0].Instances[0].PublicIpAddress" --output text