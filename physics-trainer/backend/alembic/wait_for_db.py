"""Block until the Postgres server accepts connections."""
import asyncio
import os
import sys

import asyncpg


async def wait(host: str, port: int, user: str, password: str, db: str, attempts: int = 60) -> None:
    for i in range(attempts):
        try:
            conn = await asyncpg.connect(
                host=host, port=port, user=user, password=password, database=db
            )
            await conn.close()
            print(f"Postgres is ready (attempt {i + 1})")
            return
        except Exception as e:  # noqa: BLE001
            print(f"Waiting for Postgres... ({e})")
            await asyncio.sleep(2)
    print("Postgres did not become ready in time", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://physics:physics@db:5432/physics",
    )
    # strip scheme like postgresql+asyncpg://
    rest = url.split("://", 1)[1]
    creds, hostpart = rest.split("@", 1)
    user, password = creds.split(":", 1)
    host, portdb = hostpart.split(":", 1)
    port, db = portdb.split("/", 1)
    asyncio.run(wait(host, int(port), user, password, db))


if __name__ == "__main__":
    main()
