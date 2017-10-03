# bodhi-core

## Architecture Flowchart
![Architecture Flowchart](https://github.com/bodhiproject/bodhi-core/blob/master/architecture_flowchart.png)

## Running Tests Locally
1. Install Node JS 6.9.1 (minimum)
2. Install testrpc
```
npm install -g ethereumjs-testrpc
```
3. Install truffle
```
npm install -g truffle
```
4. Install bluebird
```
npm install bluebird
```
5. Install chai
```
npm install chai
```
6. That should be all the modules needed, but if more are needed, just run:
```
npm install
```
7. Start testrpc at the commandline
```
testrpc
```
8. Open new tab and run tests
```
truffle test
```
