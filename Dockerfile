# set the base image to Debian
# https://hub.docker.com/_/debian/
FROM debian:latest
FROM node:latest

# update the repository sources list
# and install dependencies
RUN apt-get update
RUN apt-get install -y vim
RUN apt-get install -y curl
RUN apt-get -y autoclean

# create directory and add module list
WORKDIR /bodhi-core
ADD package.json package.json

# install node modules
RUN npm install -g truffle@^4.0.0-beta.2
RUN npm install

ADD . .