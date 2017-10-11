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

# copy project files
WORKDIR /bodhi-core
ADD . /bodhi-core

# install node modules
RUN npm install -g truffle@^4.0.0-beta.2
RUN npm install
