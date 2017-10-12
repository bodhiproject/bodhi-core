#!/usr/bin/env bash

# confirm docker daemon is running and connected
docker version

# build the image based on the Dockerfile and name it `nvm`
docker build -t bodhi_core .

# confirm image is present
docker images

# enter container terminal
docker run -it bodhi_core bash
