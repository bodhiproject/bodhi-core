# bodhi-core

## Architecture Flowchart
![Architecture Flowchart](https://github.com/bodhiproject/bodhi-core/blob/master/architecture_flowchart.png)

## Running Tests Locally
1. Install Node JS 6.9.1 minimum: Either with install package or via package manager: https://nodejs.org/en/download/
2. Install truffle (currently 4.0.0-beta.2):
```
npm install -g truffle@^4.0.0-beta.2
```
3. Run the NPM package.json script:
```
npm install
```
4. Start truffle dev environment:
```
truffle develop
```
5. Run test in truffle dev command line:
```
test
```
6. (Optional) If you want to see the logs from the test, open a new terminal window and:
```
truffle develop --log
```
