#!/bin/sh
npx prisma db push --accept-data-loss
exec node_modules/.bin/next start -p ${PORT:-3000}
