# hetzner-api-client
A nodeJS client for the Hetzner Robot API

## Installation
Install using NPM: 

````javascript
npm i --save hetzner-api-client
````

## Usage
First off, create a new API client instance:

````javascript
var APIClient = require('hetzner-api-client'),
    robot = new APIClient({
      username: '<your Robot username>',
      password: '<your Robot password>'
    });
````

The client is all ready now and you can start using its methods:

````javascript
robot.reverseDns.get('123.123.123.123').then(
  response => console.log(response),
  error => console.error(error)
);
````

Sample response for a valid IP address:

````json
{
  "rdns": {
    "ip": "123.123.123.123",
    "ptr": "sub.domain.tld"
  }
}
````

Sample response for an invalid IP address:

````
IP_NOT_FOUND: ip not found
````

Error messages are structured like so:

````
<ERROR_CODE>: <error message>
````

Oh. Did I mention the client is completely promise-based? It will always return a promise to your requests.

## API Documentation
Official API docs can be found [here](https://wiki.hetzner.de/index.php/Robot_Webservice/en).
