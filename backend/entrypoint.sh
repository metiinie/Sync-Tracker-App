#!/bin/sh

# run migrations
npx drizzle-kit push

# start app
node dist/main
