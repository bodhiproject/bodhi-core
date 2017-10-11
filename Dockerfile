# set the base image to Debian
# https://hub.docker.com/_/debian/
FROM debian:latest
FROM node:latest

# update the repository sources list
# and install dependencies
RUN apt-get install -y vim
RUN apt-get install -y curl
RUN apt-get -y autoclean

# install truffle and testrpc
RUN npm install -g truffle@beta

# copy project files
WORKDIR /bodhi-core
ADD . /bodhi-core
