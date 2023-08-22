# Hastebin

Hastebin is an open-source pastebin software written in node.js, which is easily
installable in any network.  It can be backed by either redis or filesystem,
and has a very easy adapter interface for other stores.  A publicly available
version can be found at [hastebin.dev](https://hastebin.dev)

Major design objectives:

* Be really pretty
* Be really simple
* Be easy to set up and use

## History

The original Hastebin website (.com version) was acquired by Toptal in 2021. To the frustration of many people, Toptal has created its own version of Hastebin, which violates all of the above major design objectives. 
That is why I strive to offer the original version of hastebin to everyone. 
You can always visit this version at the domain: [hastebin.dev](https://hastebin.dev)

## Contributing
If you're interested in contributing to Hastebin, please read our [contributing guide](https://github.com/MelvinSnijders/haste-server/blob/master/CONTRIBUTING.md).

## Tested Browsers

* Firefox 116
* Chrome 116
* Safari 16.6

## Installation

1.  Download the package, and expand it
2.  Explore the settings inside of config.json, but the defaults should be good
3.  `npm install`
4.  `npm start` (you may specify an optional `<config-path>` as well)

## Settings

* `host` - the host the server runs on (default localhost)
* `port` - the port the server runs on (default 7777)
* `keyLength` - the length of the keys to user (default 10)
* `maxLength` - maximum length of a paste (default 400000)
* `staticMaxAge` - max age for static assets (86400)
* `recompressStaticAssets` - whether or not to compile static js assets (true)
* `documents` - static documents to serve (ex: http://hastebin.dev/about.com)
  in addition to static assets.  These will never expire.
* `storage` - storage options (see below)
* `logging` - logging preferences (see below)
* `keyGenerator` - key generator options (see below)
* `rateLimits` - settings for rate limiting (see below)

## Logging
You can enable logging with the `logging` option in the configuration file.
It is based on [winston](https://github.com/winstonjs/winston). Any of the options supported by that library can be used and set in `config.json`.
Hastebin applies a default of `simple` and `colorized` formatting.

## Rate Limiting

When present, the `rateLimits` option enables built-in rate limiting courtesy
of `express-rate-limit`.  Any of the options supported by that library can be
used and set in `config.json`.

See the README for [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
for more information!

## Key Generation

### Phonetic

Attempts to generate phonetic keys, similar to `pwgen`

``` json
{
  "type": "phonetic"
}
```

### Random

Generates a random key

``` json
{
  "type": "random",
  "keyspace": "abcdef"
}
```

The _optional_ keySpace argument is a string of acceptable characters
for the key.

## Storage

### File

To use file storage (the default) change the storage section in `config.json` to
something like:

``` json
{
  "path": "./data",
  "type": "file"
}
```

where `path` represents where you want the files stored.

File storage currently does not support paste expiration.

### Redis

To use redis storage you must install the `redis` package in npm, and have
`redis-server` running on the machine.

`npm install redis`

Once you've done that, your config section should look like:

``` json
{
  "type": "redis",
  "host": "localhost",
  "port": 6379,
  "db": 2
}
```

You can also set an `expire` option to the number of seconds to expire keys in.
This is off by default, but will constantly kick back expirations on each view
or post.

All of which are optional except `type` with very logical default values.

If your Redis server is configured for password authentification, use the `password` field.

### Postgres

To use postgres storage you must install the `pg` package in npm

`npm install pg`

Once you've done that, your config section should look like:

``` json
{
  "type": "postgres",
  "connectionUrl": "postgres://user:password@host:5432/database"
}
```

You can also just set the environment variable for `DATABASE_URL` to your database connection url.

You will have to manually add a table to your postgres database:

`create table entries (id serial primary key, key varchar(255) not null, value text not null, expiration int, unique(key));`

You can also set an `expire` option to the number of seconds to expire keys in.
This is off by default, but will constantly kick back expirations on each view
or post.

All of which are optional except `type` with very logical default values.

### MongoDB

To use mongodb storage you must install the 'mongodb' package in npm

`npm install mongodb`

Once you've done that, your config section should look like:

``` json
{
  "type": "mongo",
  "connectionUrl": "mongodb://localhost:27017/database"
}
```

You can also just set the environment variable for `DATABASE_URL` to your database connection url.

Unlike with postgres you do NOT have to create the table in your mongo database prior to running.

You can also set an `expire` option to the number of seconds to expire keys in.
This is off by default, but will constantly kick back expirations on each view or post.

### Memcached

To use memcache storage you must install the `memcached` package via npm

`npm install memcached`

Once you've done that, your config section should look like:

``` json
{
  "type": "memcached",
  "host": "127.0.0.1",
  "port": 11211
}
```

You can also set an `expire` option to the number of seconds to expire keys in.
This behaves just like the redis expirations, but does not push expirations
forward on GETs.

All of which are optional except `type` with very logical default values.

### RethinkDB

To use the RethinkDB storage system, you must install the `rethinkdbdash` package via npm

`npm install rethinkdbdash`

Once you've done that, your config section should look like this:

``` json
{
  "type": "rethinkdb",
  "host": "127.0.0.1",
  "port": 28015,
  "db": "haste"
}
```

In order for this to work, the database must be pre-created before the script is ran.
Also, you must create an `uploads` table, which will store all the data for uploads.

You can optionally add the `user` and `password` properties to use a user system.

### Google Datastore

To use the Google Datastore storage system, you must install the `@google-cloud/datastore` package via npm

`npm install @google-cloud/datastore`

Once you've done that, your config section should look like this:

``` json
{
  "type": "google-datastore"
}
```

Authentication is handled automatically by [Google Cloud service account credentials](https://cloud.google.com/docs/authentication/getting-started), by providing authentication details to the GOOGLE_APPLICATION_CREDENTIALS environmental variable.

### Amazon S3

To use [Amazon S3](https://aws.amazon.com/s3/) as a storage system, you must
install the `aws-sdk` package via npm:

`npm install aws-sdk`

Once you've done that, your config section should look like this:

```json
{
  "type": "amazon-s3",
  "bucket": "your-bucket-name",
  "region": "us-east-1"
}
```

Authentication is handled automatically by the client. Check
[Amazon's documentation](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html)
for more information. You will need to grant your role these permissions to
your bucket:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "s3:GetObject",
                "s3:PutObject"
            ],
            "Effect": "Allow",
            "Resource": "arn:aws:s3:::your-bucket-name-goes-here/*"
        }
    ]
}
```

## License

Licensed under the [MIT license](https://github.com/MelvinSnijders/haste-server/blob/master/LICENSE).

### Other components:

* jQuery: MIT/GPL license
* highlight.js: Copyright © 2006, Ivan Sagalaev
* highlightjs-coffeescript: WTFPL - Copyright © 2011, Dmytrii Nagirniak