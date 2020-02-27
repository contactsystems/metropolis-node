const util = require('util');

const fs = require('fs'),
  path = require('path');

var https = require('https');

function genboundary() {
  var bounds = '--------------------------';
  for (var i = 0; 24 > i; i++) {
    bounds += Math.floor(Math.random() * 10).toString(16);
  }
  return bounds;
}

function beginbounds(boundary) {
  return `--${boundary}\r\n`;
}

function endbounds(boundary) {
  return `--${boundary}--\r\n`
}

function boundary(boundary, content) {
  return `--${boundary}\r\n${content}\r\n`
}

function file(name, type) {
  let a = [
    `Content-Disposition: form-data; name="0"; filename="${name}"`,
    `Content-Type: ${type}\r\n\r\n`
  ]
  return a.join("\r\n");
}

function map(name, data) {
  let a = [
    `Content-Disposition: form-data; name="${name}"\r\n`,
    data
  ];
  return a.join("\r\n");
}

/** Class representing SDK to C0ntact Systems */
module.exports = class ContactSDK {
  /**
   * constructor
   */
  constructor(access, secret) {
    this.access = access || process.env.CONTACTACCESS;
    this.secret = secret || process.env.CONTACTSECRET;
  }
  request(data) {
    return this.http(data);
  }
  http(data) {
    return new Promise((resolve, reject) => {
      const req = https.request({
        method: 'POST',
        hostname: process.env.COREURL || "core.contactsystems.io",
        port: 8080,
        path: `/query`,
        headers: {
          "X-Game-Access-Key": this.access,
          "X-Game-Secret-Key": this.secret,
          'Content-Type': 'application/json'
        }
      }, res => {
        const chunks = [];
        res.on('data', data => chunks.push(data))
        res.on('end', () => {
          let body = Buffer.concat(chunks);
          switch (res.headers['content-type']) {
            case 'application/json':
              body = JSON.parse(body);
              break;
          }
          body.requestID = res.headers['x-request-id'];
          resolve(body)
        })
      })
      req.on('error', reject);
      req.write(JSON.stringify({
        operationName: data.name,
        query: data.text,
        variables: data.values
      }));
      req.end();
    })
  }

  oauth(token, data) {
    return new Promise((resolve, reject) => {
      const req = https.request({
        method: 'POST',
        hostname: process.env.COREURL || "core.contactsystems.io",
        port: 8080,
        path: `/query`,
        headers: {
          "Authorization": `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }, res => {
        const chunks = [];
        res.on('data', data => chunks.push(data))
        res.on('end', () => {
          let body = Buffer.concat(chunks);
          switch (res.headers['content-type']) {
            case 'application/json':
              body = JSON.parse(body);
              break;
          }
          body.requestID = res.headers['x-request-id'];
          resolve(body)
        })
      })
      req.on('error', reject);
      req.write(JSON.stringify({
        operationName: data.name,
        query: data.text,
        variables: data.values
      }));
      req.end();
    })
  }

  upload(data) {
    return new Promise((resolve, reject) => {
      var bounds = genboundary();
      const req = https.request({
        method: 'POST',
        hostname: process.env.COREURL || "core.contactsystems.io",
        port: 8080,
        path: `/query`,
        headers: {
          "X-Game-Access-Key": this.access,
          "X-Game-Secret-Key": this.secret,
          'Content-Type': `multipart/form-data; boundary=${bounds}`
        }
      }, res => {
        const chunks = [];
        res.on('data', data => chunks.push(data))
        res.on('end', () => {
          let body = Buffer.concat(chunks);
          switch (res.headers['content-type']) {
            case 'application/json':
              body = JSON.parse(body);
              break;
          }
          body.requestID = res.headers['x-request-id'];
          resolve(body)
        })
      })
      req.on('error', reject);
      fs.readFile(data.image, function(err, buff) {
        if (err) {
          reject(err);
        } else {
          var payload = Buffer.concat([
            Buffer.from(beginbounds(bounds), 'utf8'),
            Buffer.from(file(path.basename(data.image), `image/${path.basename(data.image).split(".").pop()}`), 'utf8'),
            Buffer.from(buff, 'binary'),
            Buffer.from("\r\n", "utf8"),
            Buffer.from(boundary(bounds, map("operations", JSON.stringify({
              operationName: data.name,
              query: data.text,
              variables: data.values
            }))), 'utf8'),
            Buffer.from(boundary(bounds, map("map", JSON.stringify({
              "0": ["variables.input.imageFile"]
            }))), 'utf8'),
            Buffer.from(endbounds(bounds), 'utf8')
          ]);
          req.write(payload);
          req.end();
        }
      });
    })
  }

  refresh(client_id, client_secret, refresh, redirect_url, token, scopes) {
    return new Promise((resolve, reject) => {

      var decode = jwt_decode(token);
      if (decode.exp != undefined) {
        if (new Date(decode.exp - 20) <= new Date()) {
          resolve({
            access_token: token,
            refresh_token: refresh
          });
        } else {
          var c_i = `client_id=${client_id}`;
          var c_s = `client_secret=${client_secret}`;
          var r_t = `refresh_token=${refresh}`;
          var r_u = `redirect_uri=${redirect_url}`;
          var a_t = `access_token=${token}`;
          const req = https.request({
            method: 'POST',
            hostname: process.env.COREURL || "core.contactsystems.io",
            port: 8080,
            path: `/api/v1/oauth2/token`,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }, res => {
            const chunks = [];
            res.on('data', data => chunks.push(data))
            res.on('end', () => {
              let body = JSON.parse(Buffer.concat(chunks).toString());
              body.requestID = res.headers['x-request-id'];
              resolve(body);
            })
          })
          req.on('error', reject);
          req.write(`${c_i}&${c_s}&${r_t}&${a_t}&grant_type=refresh_token&scope=${scopes.join("%20")}`);
          req.end();
        }
      } else {
        var c_i = `client_id=${client_id}`;
        var c_s = `client_secret=${client_secret}`;
        var r_t = `refresh_token=${refresh}`;
        var r_u = `redirect_uri=${redirect_url}`;
        var a_t = `access_token=${token}`;
        const req = https.request({
          method: 'POST',
          hostname: process.env.COREURL || "core.contactsystems.io",
          path: `/api/v1/oauth2/token`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }, res => {
          const chunks = [];
          res.on('data', data => chunks.push(data))
          res.on('end', () => {
            let body = JSON.parse(Buffer.concat(chunks).toString());
            body.requestID = res.headers['x-request-id'];
            resolve(body);
          })
        })
        req.on('error', reject);
        req.write(`${c_i}&${c_s}&${r_t}&${a_t}&grant_type=refresh_token&scope=${scopes.join("%20")}`);
        req.end();
      }
    });
  }


  /**
   * GetUserLinkedAccount - Gets an Asset Issuer account for a User.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer, which is defined as an entity that creates, issues, & manages digital assets.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  getUserLinkedAccount(asset_issuer_uid, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `query userAssetIssuerVerification($assetIssuerId: ID! $userId: ID!) { userAssetIssuerVerification(assetIssuerId: $assetIssuerId userId: $userId) { id gameUserUsername gameUserUid } }`,
        name: `userAssetIssuerVerification`,
        values: {
          assetIssuerId: asset_issuer_uid,
          userId: user_uid
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.userAssetIssuerVerification);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * GetUserInventoryWithPayload - Gets a User&#39;s inventory with payload data.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer, which is defined as an entity that creates, issues, & manages digital assets.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  getUserInventoryWithPayload(asset_issuer_uid, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `query GetInventory($input: GetInventoriesQueryInput!) { inventories(input: $input) { items { asset { id payload relatedAssetSchema { id } } } } }`,
        name: `GetInventory`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            userId: user_uid,
            statuses: "INVENTORY"
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.GetInventory);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateMarketplaceAssetUnlimited - Creates an Asset from an Asset Schema.
   * @param {string} asset_schema_uid The UID of an Asset Schema, which is defined by the unique properties that make up a digital asset.
   * @param {object} json_payload The JSON schema payload, which is required to mint an Asset.
   * @return {Promise<Object>}
   */
  createMarketplaceAssetUnlimited(asset_schema_uid, json_payload) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createAsset($input: CreateAssetInput!) { createAsset(input: $input) { id } }`,
        name: `createAsset`,
        values: {
          input: {
            payload: json_payload,
            assetSchemaId: asset_schema_uid,
            template: {}
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createAsset);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateMarketplaceAssetUnlimitedWithImage - Creates an Asset from an Asset Schema.
   * @param {string} asset_schema_uid The UID of an Asset Schema, which is defined by the unique properties that make up a digital asset.
   * @param {object} json_payload The JSON schema payload, which is required to mint an Asset.
   * @param {string} image_file The directory location of an image file.
   * @return {Promise<Object>}
   */
  createMarketplaceAssetUnlimitedWithImage(asset_schema_uid, json_payload, image_file) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createAsset($input: CreateAssetInput!) { createAsset(input: $input) { id } }`,
        name: `createAsset`,
        values: {
          input: {
            payload: json_payload,
            assetSchemaId: asset_schema_uid,
            template: {},
            imageFile: image_file
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createAsset);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateMarketplaceAssetQuantity - Creates an Asset from an Asset Schema.
   * @param {string} asset_schema_uid The UID of an Asset Schema, which is defined by the unique properties that make up a digital asset.
   * @param {object} json_payload The JSON schema payload, which is required to mint an Asset.
   * @param {integer} quantity The number of digital assets listed for sale.
   * @return {Promise<Object>}
   */
  createMarketplaceAssetQuantity(asset_schema_uid, json_payload, quantity) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createAsset($input: CreateAssetInput!) { createAsset(input: $input) { id } }`,
        name: `createAsset`,
        values: {
          input: {
            payload: json_payload,
            assetSchemaId: asset_schema_uid,
            template: {}
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createAsset);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateMarketplaceAssetQuantitydWithImage - Creates an Asset from an Asset Schema.
   * @param {string} asset_schema_uid The UID of an Asset Schema, which is defined by the unique properties that make up a digital asset.
   * @param {object} json_payload The JSON schema payload, which is required to mint an Asset.
   * @param {string} image_file The directory location of an image file.
   * @param {integer} quantity The number of digital assets listed for sale.
   * @return {Promise<Object>}
   */
  createMarketplaceAssetQuantitydWithImage(asset_schema_uid, json_payload, image_file, quantity) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createAsset($input: CreateAssetInput!) { createAsset(input: $input) { id } }`,
        name: `createAsset`,
        values: {
          input: {
            payload: json_payload,
            assetSchemaId: asset_schema_uid,
            imageFile: image_file,
            template: {}
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createAsset);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateMarketplaceListing - Assigns an Asset to be listed on the marketplace.
   * @param {string} user_inventory_uid The UID of an Asset in a User's inventory
   * @param {integer} sale_price The Price set in cents (e.g., 100 = 1.00 USD)
   * @param {string} listing_data Used to display additional data for an Asset listed on sale.
   * @return {Promise<Object>}
   */
  createMarketplaceListing(user_inventory_uid, sale_price, listing_data) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createMarketplaceListing($input: CreateMarketplaceListingInput!) { createMarketplaceListing(input: $input) { id } }`,
        name: `createMarketplaceListing`,
        values: {
          input: {
            userInventoryId: user_inventory_uid,
            salePrice: sale_price,
            listingData: listing_data
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createMarketplaceListing);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateUserAssetIssuerOwnership - Links ownership of an existing User to an Asset Issuer.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer, which is defined as an entity that creates, issues, & manages digital assets.
   * @param {string} user_uid The UID of a User.
   * @param {string} game_username The username from an Asset Issuer's database to link to a User.
   * @param {string} game_uid The Unique Identifier from an Asset Issuer's database to link a User.
   * @return {Promise<Object>}
   */
  createUserAssetIssuerOwnership(asset_issuer_uid, user_uid, game_username, game_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createUserAssetIssuerOwnership($input:CreateUserAssetIssuerOwnershipInput!){ createUserAssetIssuerOwnership(input:$input){ id gameUserUsername gameUserUid } }`,
        name: `createUserAssetIssuerOwnership`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            userId: user_uid,
            gameUserUsername: game_username,
            gameUserUid: game_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createUserAssetIssuerOwnership);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * UpdateUserAssetIssuerOwnership - Updates ownership of an existing User to an Asset Issuer.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer, which is defined as an entity that creates, issues, & manages digital assets.
   * @param {string} user_uid The UID of a User.
   * @param {string} game_username The username from an Asset Issuer's database to link to a User.
   * @param {string} game_uid The Unique Identifier from an Asset Issuer's database to link a User.
   * @return {Promise<Object>}
   */
  updateUserAssetIssuerOwnership(asset_issuer_uid, user_uid, game_username, game_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation updateUserAssetIssuerOwnership($input:UpdateUserAssetIssuerOwnershipInput!) { updateUserAssetIssuerOwnership(input:$input){ id assetIssuer { id } user { id } gameUserUsername gameUserUid } }`,
        name: `updateUserAssetIssuerOwnership`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            userId: user_uid,
            gameUserUsername: game_username,
            gameUserUid: game_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.updateUserAssetIssuerOwnership);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * DeleteUserAssetIssuerOwnership - Removes the ownership link between an Asset Issuer &amp; a User.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer, which is defined as an entity that creates, issues, & manages digital assets.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  deleteUserAssetIssuerOwnership(asset_issuer_uid, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation deleteUserAssetIssuerOwnership($input:DeleteUserAssetIssuerOwnershipInput!) { deleteUserAssetIssuerOwnership(input:$input){ id assetIssuer { id } user { id } gameUserUsername gameUserUid } }`,
        name: `deleteUserAssetIssuerOwnership`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            userId: user_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.deleteUserAssetIssuerOwnership);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * DispatchExternalInvite - Invites Users to join the marketplace.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer, which is defined as an entity that creates, issues, & manages digital assets.
   * @param {string} game_email The email address of a User.
   * @param {string} game_username The username from an Asset Issuer's database to link to a User.
   * @param {string} game_uid The Unique Identifier from an Asset Issuer's database to link a User.
   * @return {Promise<Object>}
   */
  dispatchExternalInvite(asset_issuer_uid, game_email, game_username, game_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation dispatchExternalInvite($input:DispatchExternalInviteInput!) { dispatchExternalInvite(input:$input){ id } }`,
        name: `dispatchExternalInvite`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            gameUserEmail: game_email,
            gameUserUsername: game_username,
            gameUserUid: game_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.dispatchExternalInvite);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * ConsumeExternalInvite - Activates keys for a User.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer, which is defined as an entity that creates, issues, & manages digital assets.
   * @param {string} invite_key The invite key sent to a User.
   * @return {Promise<Object>}
   */
  consumeExternalInvite(asset_issuer_uid, invite_key) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation consumeExternalInvite($input: ConsumeExternalInviteInput!) { consumeExternalInvite(input: $input){ id } }`,
        name: `consumeExternalInvite`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            inviteKey: invite_key
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.consumeExternalInvite);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateUserAssetIssuerAccessGrant - Grants access to inventory outside of a Game Session.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer, which is defined as an entity that creates, issues, & manages digital assets.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  createUserAssetIssuerAccessGrant(asset_issuer_uid, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createUserAssetIssuerAccessGrant($input: CreateUserAssetIssuerAccessGrantInput!) { createUserAssetIssuerAccessGrant(input: $input){ id } }`,
        name: `createUserAssetIssuerAccessGrant`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            userId: user_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createUserAssetIssuerAccessGrant);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * DeleteUserAssetIssuerAccessGrant - Deletes access to inventory outside of a Game Session.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer, which is defined as an entity that creates, issues, & manages digital assets.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  deleteUserAssetIssuerAccessGrant(asset_issuer_uid, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation deleteUserAssetIssuerAccessGrant($input: DeleteUserAssetIssuerAccessGrantInput!) { deleteUserAssetIssuerAccessGrant(input: $input){ id } }`,
        name: `deleteUserAssetIssuerAccessGrant`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            userId: user_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.deleteUserAssetIssuerAccessGrant);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * AssignItem - Assigns a minted Asset to a User that has not been previously assigned.
   * @param {string} asset_uid An Asset that has been minted from an Asset Schema, but has not been assigned to a User.
   * @param {string} recipient_uid The User UID to receive an Asset.
   * @return {Promise<Object>}
   */
  assignItem(asset_uid, recipient_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation assignItem($input: AssignItemMutationInput!) { assignItem(input: $input) { objectId } }`,
        name: `assignItem`,
        values: {
          input: {
            assetId: asset_uid,
            recipientId: recipient_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.assignItem);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * LoginUser - Enables User log in.
   * @param {string} user_email A User’s email address.
   * @param {string} user_password A User’s password.
   * @return {Promise<Object>}
   */
  loginUser(user_email, user_password) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation loginUser($input: LoginInput!) { loginUser(input: $input) { accessToken, expires, refreshToken } }`,
        name: `loginUser`,
        values: {
          input: {
            email: user_email,
            password: user_password
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.loginUser);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * UnlockUserInventory - Unlocks a User&#39;s inventory during a Game Session if the Game Session is locked.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer, which is defined as an entity that creates, issues, & manages digital assets.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  unlockUserInventory(asset_issuer_uid, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation unlockUserGameSessionInventory($input:UnlockUserGameSessionInventoryInput!) { unlockUserGameSessionInventory(input:$input) { id bucketLock deletedAt } }`,
        name: `unlockUserGameSessionInventory`,
        values: {
          assetIssuerId: asset_issuer_uid,
          userId: user_uid
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.unlockUserGameSessionInventory);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * UnlockUserInventoryOAuth - Unlocks a User&#39;s inventory during a Game Session if the Game Session is locked.
   * @param {string} oauth_access_token The token that is obtained via 0Auth2.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer, which is defined as an entity that creates, issues, & manages digital assets.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  unlockUserInventoryOAuth(oauth_access_token, asset_issuer_uid, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation unlockUserGameSessionInventory($input:UnlockUserGameSessionInventoryInput!) { unlockUserGameSessionInventory(input:$input) { id bucketLock deletedAt } }`,
        name: `unlockUserGameSessionInventory`,
        values: {
          assetIssuerId: asset_issuer_uid,
          userId: user_uid
        }
      };
      this.oauth(oauth_access_token, query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.unlockUserGameSessionInventory);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * LockUserInventory - Locks a User&#39;s inventory during a Game Session if the Game Session is unlocked.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer, which is defined as an entity that creates, issues, & manages digital assets.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  lockUserInventory(asset_issuer_uid, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation lockUserGameSessionInventory($input:LockUserGameSessionInventoryInput!) { lockUserGameSessionInventory(input:$input) { id bucketLock createdAt } }`,
        name: `lockUserGameSessionInventory`,
        values: {
          assetIssuerId: asset_issuer_uid,
          userId: user_uid
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.lockUserGameSessionInventory);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * LockUserInventoryOAuth - Locks a User&#39;s inventory during a Game Session if the Game Session is unlocked.
   * @param {string} oauth_access_token The token that is obtained via 0Auth2.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer, which is defined as an entity that creates, issues, & manages digital assets.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  lockUserInventoryOAuth(oauth_access_token, asset_issuer_uid, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation lockUserGameSessionInventory($input:LockUserGameSessionInventoryInput!) { lockUserGameSessionInventory(input:$input) { id bucketLock createdAt } }`,
        name: `lockUserGameSessionInventory`,
        values: {
          assetIssuerId: asset_issuer_uid,
          userId: user_uid
        }
      };
      this.oauth(oauth_access_token, query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.lockUserGameSessionInventory);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * MintAssetSchemaForUser - Enables an Asset Issuer to mint an Asset Schema into an Asset &amp; then assign it to a User&#39;s inventory.
   * @param {string} asset_schema_uid The UID of an Asset Schema, which is defined by the unique properties that make up a digital asset.
   * @param {string} user_uid The UID of a User.
   * @param {object} json_payload The JSON schema payload, which is required to mint an Asset.
   * @return {Promise<Object>}
   */
  mintAssetSchemaForUser(asset_schema_uid, user_uid, json_payload) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createAndAssignAsset($input: CreateAndAssignAssetInput!) { createAndAssignAsset(input: $input) { id payload } }`,
        name: `createAndAssignAsset`,
        values: {
          input: {
            payload: json_payload,
            assetSchemaId: asset_schema_uid,
            userId: user_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createAndAssignAsset);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * UpdateInventoryAsset - Allows an Asset Issuer to update an Asset within a User&#39;s inventory.
   * @param {string} inventory_uid The UID of an Asset stored on a User's account.
   * @param {object} json_payload The JSON schema payload, which is required to mint an Asset.
   * @return {Promise<Object>}
   */
  updateInventoryAsset(inventory_uid, json_payload) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation updateAsset($input: UpdateAssetInput!) { updateAsset(input: $input) { id payload } }`,
        name: `updateAsset`,
        values: {
          input: {
            id: inventory_uid,
            payload: json_payload
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.updateAsset);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * GetUserInventoryAsset - Gets Asset data for an Asset within a User’s inventory.
   * @param {string} asset_uid An Asset within a User's inventory.
   * @return {Promise<Object>}
   */
  getUserInventoryAsset(asset_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `query asset($input: GetAssetInput!) { asset(input: $input) { id payload assetStatus } }`,
        name: `asset`,
        values: {
          input: {
            id: asset_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.asset);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * GetAssetIssuer - Gets an Asset Issuer&#39;s data.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @return {Promise<Object>}
   */
  getAssetIssuer(asset_issuer_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `query assetIssuer($input: GetAssetIssuerByIdInput!) { assetIssuer(input: $input){ id name isActive industry primaryImage { id url } } }`,
        name: `assetIssuer`,
        values: {
          input: {
            id: asset_issuer_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.assetIssuer);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * GetAllAssetSchemas - Gets all Asset Schemas created by an Asset Issuer.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @return {Promise<Object>}
   */
  getAllAssetSchemas(asset_issuer_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `query assetSchemas($input: GetAssetSchemasInput!) { assetSchemas(input: $input){ totalCount assetSchemas { id name schema isActive isTradable isSellable isRevocable isBurnable primaryImage { id url } } } }`,
        name: `assetSchemas`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.assetSchemas);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * GetAssetSchema - Gets a designated Asset Schema created by an Asset Issuer.
   * @param {string} asset_schema_uid The UID of an Asset Schema, which is defined by the unique properties that make up a digital asset.
   * @return {Promise<Object>}
   */
  getAssetSchema(asset_schema_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `query assetSchema($id: ID!) { assetSchema(id: $id) { id name schema isActive isTradable isSellable isRevocable isBurnable primaryImage { url } } }`,
        name: `assetSchema`,
        values: {
          id: asset_schema_uid
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.assetSchema);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateAssetSchema - Creates an Asset Schema.
   * @param {string} schema_name An Asset Schema’s name.
   * @param {string} schema_json A JSON Schema, which is required to create an Asset Schema https://json-schema.org/
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @param {boolean} isactive Enables Asset Schemas to be minted; if “Inactive”, the developer is unable to mint new Assets.
   * @param {boolean} istradable Enables minted Assets to be traded between Users.
   * @param {boolean} issellable Enables minted Assets to be sold.
   * @param {boolean} isrevocable Enables an Asset Issuer to remove a minted Asset from a User’s inventory.
   * @param {boolean} isburnable Enables an Asset Issuer to delete a minted Asset from a User’s inventory.
   * @param {array.string} tags List of tags for an associated Asset Schema; Max is 5.
   * @param {string} category Category ID for a category.
   * @return {Promise<Object>}
   */
  createAssetSchema(schema_name, schema_json, asset_issuer_uid, isactive, istradable, issellable, isrevocable, isburnable, tags, category) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createAssetSchema($input: CreateAssetSchemaInput!) { createAssetSchema(input: $input) { id } }`,
        name: `createAssetSchema`,
        values: {
          input: {
            name: schema_name,
            schema: schema_json,
            assetIssuerId: asset_issuer_uid,
            isActive: isactive,
            isTradable: istradable,
            isSellable: issellable,
            isRevocable: isrevocable,
            isBurnable: isburnable,
            tags: tags,
            categoryId: category
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createAssetSchema);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateAssetSchemaWithImage - Creates an Asset Schema.
   * @param {string} schema_name An Asset Schema’s name.
   * @param {string} schema_json A JSON Schema, which is required to create an Asset Schema https://json-schema.org/
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @param {boolean} isactive Enables Asset Schemas to be minted; if “Inactive”, the developer is unable to mint new Assets.
   * @param {boolean} istradable Enables minted Assets to be traded between Users.
   * @param {boolean} issellable Enables minted Assets to be sold.
   * @param {boolean} isrevocable Enables an Asset Issuer to remove a minted Asset from a User’s inventory.
   * @param {boolean} isburnable Enables an Asset Issuer to delete a minted Asset from a User’s inventory.
   * @param {array.string} tags List of tags for an associated Asset Schema; Max is 5.
   * @param {string} category Category ID for a category.
   * @param {string} image_file The directory location of an image file.
   * @return {Promise<Object>}
   */
  createAssetSchemaWithImage(schema_name, schema_json, asset_issuer_uid, isactive, istradable, issellable, isrevocable, isburnable, tags, category, image_file) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createAssetSchema($input: CreateAssetSchemaInput!) { createAssetSchema(input: $input) { id } }`,
        name: `createAssetSchema`,
        values: {
          input: {
            name: schema_name,
            schema: schema_json,
            assetIssuerId: asset_issuer_uid,
            isActive: isactive,
            isTradable: istradable,
            isSellable: issellable,
            isRevocable: isrevocable,
            isBurnable: isburnable,
            tags: tags,
            categoryId: category,
            imageFile: image_file
          }

        },
        image: image_file

      };
      this.upload(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createAssetSchema);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * GetUserFromGameSession - Gets a User&#39;s data from a Game Session.
   * @param {string} user_session The User Session passed from the Desktop Login App.
   * @return {Promise<Object>}
   */
  getUserFromGameSession(user_session) {
    return new Promise((res, rej) => {
      let query = {
        text: `query userAssetIssuerSessionBySessionKey($session: STRING!) { userAssetIssuerSessionBySessionKey(session: $session) { id user { id username } } }`,
        name: `userAssetIssuerSessionBySessionKey`,
        values: {
          session: user_session
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.userAssetIssuerSessionBySessionKey);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateGameSession - Creates a Game Session for a User.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  createGameSession(asset_issuer_uid, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createUserAssetIssuerSession($input: CreateUserAssetIssuerSessionInput!) { createUserAssetIssuerSession(input: $input) { id bucketLock sessionKey } }`,
        name: `createUserAssetIssuerSession`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            userId: user_uid,
            bucketLock: false
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createUserAssetIssuerSession);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateGameSessionOAuth - Creates a Game Session for a User.
   * @param {string} oauth_access_token The token that is obtained via 0Auth2.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  createGameSessionOAuth(oauth_access_token, asset_issuer_uid, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createUserAssetIssuerSession($input: CreateUserAssetIssuerSessionInput!) { createUserAssetIssuerSession(input: $input) { id bucketLock sessionKey } }`,
        name: `createUserAssetIssuerSession`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            userId: user_uid,
            bucketLock: false
          }
        }
      };
      this.oauth(oauth_access_token, query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createUserAssetIssuerSession);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateLockedGameSession - Creates a Game Session with the inventory locked by an Asset Issuer for a User.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  createLockedGameSession(asset_issuer_uid, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createUserAssetIssuerSession($input: CreateUserAssetIssuerSessionInput!) { createUserAssetIssuerSession(input: $input) { id bucketLock sessionKey } }`,
        name: `createUserAssetIssuerSession`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            userId: user_uid,
            bucketLock: true
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createUserAssetIssuerSession);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateLockedGameSessionOAuth - Creates a Game Session with the inventory locked by an Asset Issuer for a User.
   * @param {string} oauth_access_token The token that is obtained via 0Auth2.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  createLockedGameSessionOAuth(oauth_access_token, asset_issuer_uid, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createUserAssetIssuerSession($input: CreateUserAssetIssuerSessionInput!) { createUserAssetIssuerSession(input: $input) { id bucketLock sessionKey } }`,
        name: `createUserAssetIssuerSession`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            userId: user_uid,
            bucketLock: true
          }
        }
      };
      this.oauth(oauth_access_token, query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createUserAssetIssuerSession);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * EndGameSession - Ends a Game Session for a User.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  endGameSession(user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation deleteUserAssetIssuerSession($input: ID!) { deleteUserAssetIssuerSession(input: $input){ id } }`,
        name: `deleteUserAssetIssuerSession`,
        values: {
          input: user_uid
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.deleteUserAssetIssuerSession);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * EndGameSessionOAuth - Ends a Game Session for a User.
   * @param {string} oauth_access_token The token that is obtained via 0Auth2.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  endGameSessionOAuth(oauth_access_token, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation deleteUserAssetIssuerSession($input: ID!) { deleteUserAssetIssuerSession(input: $input){ id } }`,
        name: `deleteUserAssetIssuerSession`,
        values: {
          input: user_uid
        }
      };
      this.oauth(oauth_access_token, query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.deleteUserAssetIssuerSession);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * LinkAssetIssuerAccountToUser - Links an Asset Issuer&#39;s account to a User account.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @param {string} user_uid The UID of a User.
   * @param {string} game_username The username from an Asset Issuer's database to link to a User.
   * @param {string} game_uid The Unique Identifier from an Asset Issuer's database to link a User.
   * @return {Promise<Object>}
   */
  linkAssetIssuerAccountToUser(asset_issuer_uid, user_uid, game_username, game_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createUserAssetIssuerVerification($input: CreateUserAssetIssuerVerificationInput!) { createUserAssetIssuerVerification(input: $input){ id } }`,
        name: `createUserAssetIssuerVerification`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            userId: user_uid,
            gameUserUsername: game_username,
            gameUserUid: game_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createUserAssetIssuerVerification);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * UnlinkAssetIssuerAccountFromUser - Unlinks an Asset Issuer&#39;s account to a User account.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @param {string} user_uid The UID of a User.
   * @return {Promise<Object>}
   */
  unlinkAssetIssuerAccountFromUser(asset_issuer_uid, user_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation deleteUserAssetIssuerVerification($input: DeleteUserAssetIssuerVerificationInput!) { deleteUserAssetIssuerVerification(input: $input) { id } }`,
        name: `deleteUserAssetIssuerVerification`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            userId: user_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.deleteUserAssetIssuerVerification);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * UpdateAssetIssuer - Updates an Asset Issuer.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @param {string} issuer_name An Asset Issuer’s name.
   * @param {string} issuer_industry An Asset Issuer's industry.
   * @return {Promise<Object>}
   */
  updateAssetIssuer(asset_issuer_uid, issuer_name, issuer_industry) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation updateAssetIssuer($input: UpdateAssetIssuerInput!) { updateAssetIssuer(input: $input) { id name industry } }`,
        name: `updateAssetIssuer`,
        values: {
          input: {
            id: asset_issuer_uid,
            name: issuer_name,
            industry: issuer_industry
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.updateAssetIssuer);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateAssetIssuer - Creates an Asset Issuer.
   * @param {string} organization_uid The UID of an Organization.
   * @param {string} issuer_name An Asset Issuer’s name.
   * @param {string} issuer_industry An Asset Issuer's industry.
   * @return {Promise<Object>}
   */
  createAssetIssuer(organization_uid, issuer_name, issuer_industry) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createAssetIssuer($input: CreateAssetIssuerInput!) { createAssetIssuer(input: $input) { id name industry } }`,
        name: `createAssetIssuer`,
        values: {
          input: {
            organizationId: organization_uid,
            name: issuer_name,
            industry: issuer_industry
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createAssetIssuer);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * UpdateAssetIssuerWithImage - Updates an Asset Issuer with an image.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @param {string} issuer_name An Asset Issuer’s name.
   * @param {string} issuer_industry An Asset Issuer's industry.
   * @param {string} image_file The directory location of an image file.
   * @return {Promise<Object>}
   */
  updateAssetIssuerWithImage(asset_issuer_uid, issuer_name, issuer_industry, image_file) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation updateAssetIssuer($input: UpdateAssetIssuerInput!) { updateAssetIssuer(input: $input) { id } }`,
        name: `updateAssetIssuer`,
        values: {
          input: {
            id: asset_issuer_uid,
            name: issuer_name,
            industry: issuer_industry,
            imageFile: image_file
          }

        },
        image: image_file

      };
      this.upload(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.updateAssetIssuer);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateAssetIssuerWithImage - Creates an Asset Issuer with an image.
   * @param {string} organization_uid The UID of an Organization.
   * @param {string} issuer_name An Asset Issuer’s name.
   * @param {string} issuer_industry An Asset Issuer's industry.
   * @param {string} image_file The directory location of an image file.
   * @return {Promise<Object>}
   */
  createAssetIssuerWithImage(organization_uid, issuer_name, issuer_industry, image_file) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createAssetIssuer($input: CreateAssetIssuerInput!) { createAssetIssuer(input: $input) { id name industry } }`,
        name: `createAssetIssuer`,
        values: {
          input: {
            organizationId: organization_uid,
            name: issuer_name,
            industry: issuer_industry,
            imageFile: image_file
          }

        },
        image: image_file

      };
      this.upload(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createAssetIssuer);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * UpdateAssetSchemaWithImage - Updates an existing Asset Issuer.
   * @param {string} asset_schema_uid The UID of an Asset Schema, which is defined by the unique properties that make up a digital asset.
   * @param {string} schema_name An Asset Schema’s name.
   * @param {string} schema_json A JSON Schema, which is required to create an Asset Schema https://json-schema.org/
   * @param {boolean} issellable Enables minted Assets to be sold.
   * @param {boolean} istradable Enables minted Assets to be traded between Users.
   * @param {boolean} isrevocable Enables an Asset Issuer to remove a minted Asset from a User’s inventory.
   * @param {boolean} isburnable Enables an Asset Issuer to delete a minted Asset from a User’s inventory.
   * @param {boolean} isactive Enables Asset Schemas to be minted; if “Inactive”, the developer is unable to mint new Assets.
   * @param {array.string} tags List of tags for an associated Asset Schema; Max is 5.
   * @param {string} category Category ID for a category.
   * @param {string} image_file The directory location of an image file.
   * @return {Promise<Object>}
   */
  updateAssetSchemaWithImage(asset_schema_uid, schema_name, schema_json, issellable, istradable, isrevocable, isburnable, isactive, tags, category, image_file) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation updateAssetSchema($input: UpdateAssetSchemaInput!) { updateAssetSchema(input: $input) { id } }`,
        name: `updateAssetSchema`,
        values: {
          input: {
            id: asset_schema_uid,
            name: schema_name,
            schema: schema_json,
            isSellable: issellable,
            isTradable: istradable,
            isRevocable: isrevocable,
            isBurnable: isburnable,
            isActive: isactive,
            tags: tags,
            categoryId: category,
            imageFile: image_file
          }

        },
        image: image_file

      };
      this.upload(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.updateAssetSchema);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * UpdateAssetSchema - Updates an existing Asset Issuer.
   * @param {string} asset_schema_uid The UID of an Asset Schema, which is defined by the unique properties that make up a digital asset.
   * @param {string} schema_name An Asset Schema’s name.
   * @param {string} schema_json A JSON Schema, which is required to create an Asset Schema https://json-schema.org/
   * @param {boolean} issellable Enables minted Assets to be sold.
   * @param {boolean} istradable Enables minted Assets to be traded between Users.
   * @param {boolean} isrevocable Enables an Asset Issuer to remove a minted Asset from a User’s inventory.
   * @param {boolean} isburnable Enables an Asset Issuer to delete a minted Asset from a User’s inventory.
   * @param {boolean} isactive Enables Asset Schemas to be minted; if “Inactive”, the developer is unable to mint new Assets.
   * @param {array.string} tags List of tags for an associated Asset Schema; Max is 5.
   * @param {string} category Category ID for a category.
   * @return {Promise<Object>}
   */
  updateAssetSchema(asset_schema_uid, schema_name, schema_json, issellable, istradable, isrevocable, isburnable, isactive, tags, category) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation updateAssetSchema($input: UpdateAssetSchemaInput!) { updateAssetSchema(input: $input) { id } }`,
        name: `updateAssetSchema`,
        values: {
          input: {
            id: asset_schema_uid,
            name: schema_name,
            schema: schema_json,
            isSellable: issellable,
            isTradable: istradable,
            isRevocable: isrevocable,
            isBurnable: isburnable,
            isActive: isactive,
            tags: tags,
            categoryId: category
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.updateAssetSchema);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * RevokeInventoryAsset - Revokes an Asset within a user&#39;s inventory.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @param {string} asset_uid An Asset within a User's inventory.
   * @return {Promise<Object>}
   */
  revokeInventoryAsset(asset_issuer_uid, asset_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation revokeAsset($input: RevokeAssetMutationInput!) { revokeAsset(input: $input) { objectId } }`,
        name: `revokeAsset`,
        values: {
          input: {
            assetId: asset_uid,
            recipientId: asset_issuer_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.revokeAsset);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * UseInventoryAsset - Uses an Asset within a User&#39;s inventory.
   * @param {string} asset_uid An Asset within a User's inventory.
   * @return {Promise<Object>}
   */
  useInventoryAsset(asset_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation useAsset($input: UseAssetMutationInput!) { useAsset(input: $input) { objectId } }`,
        name: `useAsset`,
        values: {
          input: {
            assetId: asset_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.useAsset);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * InviteUserFromAssetIssuer - Invites a User from an Asset Issuer&#39;s User System into the C0NTACT System’s User System.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @param {string} game_username The username from an Asset Issuer's database to link to a User.
   * @param {string} game_uid The Unique Identifier from an Asset Issuer's database to link a User.
   * @param {string} game_email The email address of a User.
   * @return {Promise<Object>}
   */
  inviteUserFromAssetIssuer(asset_issuer_uid, game_username, game_uid, game_email) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation createAssetIssuerWebhookInvite($input: CreateAssetIssuerWebhookInviteInput!) { createAssetIssuerWebhookInvite(input: $input) { id } }`,
        name: `createAssetIssuerWebhookInvite`,
        values: {
          input: {
            assetIssuerId: asset_issuer_uid,
            gameUserUsername: game_username,
            gameUserUid: game_uid,
            gameUserEmail: game_email
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.createAssetIssuerWebhookInvite);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * ListAssetIssuerAccounts - Lists all linked accounts for an Asset Issuer.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @return {Promise<Object>}
   */
  listAssetIssuerAccounts(asset_issuer_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `query userAssetIssuerVerificationsByAssetIssuerID($id: ID!) { userAssetIssuerVerificationsByAssetIssuerID(id: $id) { totalCount userAssetIssuerVerifications { id gameUserUsername gameUserUid user { id username } } } } }`,
        name: `userAssetIssuerVerificationsByAssetIssuerID`,
        values: {
          id: asset_issuer_uid
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.userAssetIssuerVerificationsByAssetIssuerID);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * DisableAssetSchema - Disables an enabled Asset Schema.
   * @param {string} asset_schema_uid The UID of an Asset Schema, which is defined by the unique properties that make up a digital asset.
   * @return {Promise<Object>}
   */
  disableAssetSchema(asset_schema_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation updateAssetSchema($input: UpdateAssetSchemaInput!) { updateAssetSchema(input: $input) { id } }`,
        name: `updateAssetSchema`,
        values: {
          input: {
            id: asset_schema_uid,
            isActive: false
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.updateAssetSchema);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * EnableAssetSchema - Enables a disabled Asset Schema.
   * @param {string} asset_schema_uid The UID of an Asset Schema, which is defined by the unique properties that make up a digital asset.
   * @return {Promise<Object>}
   */
  enableAssetSchema(asset_schema_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation updateAssetSchema($input: UpdateAssetSchemaInput!) { updateAssetSchema(input: $input) { id } }`,
        name: `updateAssetSchema`,
        values: {
          input: {
            id: asset_schema_uid,
            isActive: true
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.updateAssetSchema);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * DisableAssetIssuer - Disables a Enabled Asset Issuer.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @return {Promise<Object>}
   */
  disableAssetIssuer(asset_issuer_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation updateAssetIssuer($input: UpdateAssetIssuerInput!) { updateAssetIssuer(input: $input) { id } }`,
        name: `updateAssetIssuer`,
        values: {
          input: {
            id: asset_issuer_uid,
            isActive: false
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.updateAssetIssuer);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * EnableAssetIssuer - Enables a disabled Asset Issuer.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @return {Promise<Object>}
   */
  enableAssetIssuer(asset_issuer_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation updateAssetIssuer($input: UpdateAssetIssuerInput!) { updateAssetIssuer(input: $input) { id } }`,
        name: `updateAssetIssuer`,
        values: {
          input: {
            id: asset_issuer_uid,
            isActive: true
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.updateAssetIssuer);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * CreateOauth2Client - Allows a Developer to create a OAuth 2 Client.
   * @param {string} domain The domain URL for the redirection system.
   * @param {string} description Identifies the use of the OAuth2 Client.
   * @param {string} asset_issuer_uid The UID of an Asset Issuer.
   * @return {Promise<Object>}
   */
  createOauth2Client(domain, description, asset_issuer_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `mutation CreateOauth2Client( $input: CreateOauth2ClientPayload! ){ createOauth2Client(input: $input) { clientId secretId data } }`,
        name: `CreateOauth2Client`,
        values: {
          input: {
            domain: domain,
            description: description,
            assetIssuerId: asset_issuer_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.CreateOauth2Client);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * GetUserDataOAuth - Gets a User&#39;s OAuth data.
   * @param {string} oauth_access_token The token that is obtained via 0Auth2.
   * @return {Promise<Object>}
   */
  getUserDataOAuth(oauth_access_token) {
    return new Promise((res, rej) => {
      let query = {
        text: `query Me { me { id username primaryImage { id url } } }`,
        name: `Me`,
        values: {

        }
      };
      this.oauth(oauth_access_token, query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.Me);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * ListCategories - Lists all categories for an Asset Schema.

   * @return {Promise<Object>}
   */
  listCategories() {
    return new Promise((res, rej) => {
      let query = {
        text: `query listCategories{ categories { categories { id name description } } }`,
        name: `listCategories`,
        values: {

        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.listCategories);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }

  /**
   * ListAssetIssuers - Lists all Asset Issuers for an Organization.
   * @param {string} organization_uid The UID of an Organization.
   * @return {Promise<Object>}
   */
  listAssetIssuers(organization_uid) {
    return new Promise((res, rej) => {
      let query = {
        text: `query ListAssetIssuers($input: GetAssetIssuersInput!) { assetIssuers(input: $input) { totalCount assetIssuers { id name apiKey { id accessKey secretKey } } } }`,
        name: `ListAssetIssuers`,
        values: {
          input: {
            organizationId: organization_uid
          }
        }
      };
      this.request(query).then((data) => {
        if (data.errors != undefined) {
          rej(data.errors);
        } else {
          res(data.data.ListAssetIssuers);
        }
      }).catch((err) => {
        rej(err);
      });
    });
  }
}
