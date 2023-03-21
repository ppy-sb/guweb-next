# Guccho

## What is Guccho?

Guccho is a web interface to interact with osu private servers with compatibility in mind.

## Requirements

- Nodejs >= 14
- at least one supported platform (see supporting platforms down below)

## Setup

- Config .env
- Config `activeAdapter` in nuxt.config.ts
- Run `yarn`

## platforms

- ### bancho.py (aka gulag)

- ### ppy.sb

  Run `yarn build:schemas`

## Development Server

Start the development server on <http://localhost:3000>

```bash
yarn dev
```

## Production

Build the application for production:

```bash
# yarn
yarn build
```

Locally preview production build:

```bash
# yarn
yarn preview
```

Checkout the [deployment documentation](https://v3.nuxtjs.org/guide/deploy/presets) for more information.

## The team (Guccho)

- [ppy.sb](https://github.com/ppy-sb)
- [Varkaria](https://github.com/Varkaria)

### todo(s)

TODO Register
TODO Give first registered user owner privilege

## AppConfig and ServerConfig

see `src/app.config.ts` and `src/adapters/bancho.py/exports.ts`, more detailed readme will be provided later.
