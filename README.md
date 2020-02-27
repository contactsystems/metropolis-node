![](files/metropolis-nodejs-githubheader.jpg)

> The Metropolis Node.js SDK provides game developer tools to facilitate gaming item generation & user ownership association

Our SDK includes:

  * User authentication
  * Digital asset storage, retrieval, & modification
  * Game ownership validation
  * Game session creation
  * Game service to primary marketplace integration
  * Digital asset creation and minting
  * User inventory management

## Getting Started

**To onboarding to our system, please email us at:** info@contactsystems.io

**Wiki:** https://github.com/contactsystems/metropolis-node/wiki

**Guides:** https://github.com/contactsystems/metropolis-node/wiki/1.-Guides

**PDF:** https://github.com/contactsystems/metropolis-node/blob/master/files/node.master.pdf

## Installing & Example

#### NPM

Install via [npm](https://www.npmjs.com/):
```sh
~$ npm install metropolis-node --save
```

#### Example
```javascript
var access = "00000000-0000-0000-0000-000000000000", secret = "00000000-0000-0000-0000-000000000000";
var contact = require('metropolis-node'), sdk = new contact(access, secret);
```

## Open Issues
If you encounter a bug/error with the Metropolis SDK for Node.js, we'd love to hear about it. Search our [Existing Issues](https://github.com/contactsystems/metropolis-node/issues) & if you're unable to find it there, please open a new issue. Make sure to include:
* SDK version
* Node.js version
* OS & OS version
* Let us know if you're running this inside Docker Container
* Stack Trace or Debug error message

GitHub Issues are intended for Bug Reports & Feature Requests. For help utilizing our Node.js SDK, please visit our [Discord](https://discord.gg/E9WVsWt) & let us know how we can help.

## Contact Us

**Website:** [CØNTACT Systems](https://www.contactsystems.io/)

**Twitter:** [Twitter](https://twitter.com/c0ntactsystems)

**Facebook:** [Facebook](facebook.com/c0ntactsystems)

**Blog:** [Medium](https://medium.com/c%C3%B8ntact-systems)

**Chat:** [Discord](https://discord.gg/J9ntMyU)

## License

This SDK is distributed under the [SDK License](https://www.contactsystems.io/sdk-license-agreement), see LICENSE.md for more information.
